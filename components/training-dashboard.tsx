'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, RotateCcw, Brain, Database } from 'lucide-react';
import { LearningEngine, AlgorithmWeights } from '@/lib/ml-learning-engine';
import { TransferTracker, TransferOutcome } from '@/lib/ml-transfer-tracker';
import { Player, Team, Fixture } from '@/lib/fpl-api';
import { runSimulation, SimulationScenario } from '@/lib/simulation-utils';

interface TrainingDashboardProps {
    allPlayers: Player[];
    teams: Team[];
    fixtures: Fixture[];
    playerHistories: { [key: number]: any };
}

export function TrainingDashboard({ allPlayers, teams, fixtures, playerHistories }: TrainingDashboardProps) {
    const [weights, setWeights] = useState<AlgorithmWeights | null>(null);
    const [outcomes, setOutcomes] = useState<TransferOutcome[]>([]);
    const [isTraining, setIsTraining] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        // Load initial data
        const loadData = async () => {
            const currentWeights = await LearningEngine.getCurrentWeights();
            setWeights(currentWeights);
            const currentOutcomes = await TransferTracker.getOutcomes();
            setOutcomes(currentOutcomes);
        };
        loadData();
    }, []);

    const runSimulationBatch = async () => {
        setIsTraining(true);
        setLogs(prev => ['Starting real simulation...', ...prev]);

        // Simulate a delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 500));

        const currentWeights = weights || await LearningEngine.getCurrentWeights();
        const newOutcomes: TransferOutcome[] = [];
        const scenariosCount = 5;

        // Determine valid gameweek range for simulation
        let maxGw = 1;
        Object.values(playerHistories).forEach((h: any) => {
            if (h.history && h.history.length > 0) {
                const last = h.history[h.history.length - 1].round;
                if (last > maxGw) maxGw = last;
            }
        });

        const minStartGw = 4;
        const maxStartGw = Math.max(minStartGw, maxGw - 3);

        for (let i = 0; i < scenariosCount; i++) {
            // 1. Pick random GW
            const gameweek = Math.floor(Math.random() * (maxStartGw - minStartGw + 1)) + minStartGw;

            // 2. Use top 200 players by total points for more realistic scenarios
            const topPlayers = allPlayers
                .filter(p => playerHistories[p.id]?.history?.length > 0)
                .sort((a, b) => b.total_points - a.total_points)
                .slice(0, 200);

            if (topPlayers.length < 20) {
                setLogs(prev => ['Error: Not enough player history data', ...prev]);
                break;
            }

            // Shuffle top players and pick 15 for team, rest for market
            const shuffled = topPlayers.sort(() => 0.5 - Math.random());
            const team = shuffled.slice(0, 15);
            const market = shuffled.slice(15);

            const scenario: SimulationScenario = {
                gameweek,
                team,
                market,
                budget: 1000 // ample budget for simplicity
            };

            // 3. Run Simulation
            const result = runSimulation(scenario, currentWeights, playerHistories, fixtures);

            if (result.transferIn && result.transferOut) {
                const outcome = await TransferTracker.recordOutcome({
                    decisionId: `sim-${Date.now()}-${i}`,
                    actualPointsGained: result.pointsDiff,
                    weeksEvaluated: 3,
                    successScore: result.success ? 100 : 0
                });

                if (outcome) {
                    newOutcomes.push(outcome);
                    setLogs(prev => [`[GW${gameweek}] Swapped ${result.transferOut?.web_name} -> ${result.transferIn?.web_name}. Diff: ${result.pointsDiff} pts`, ...prev]);
                }
            } else {
                setLogs(prev => [`[GW${gameweek}] No suitable transfer found`, ...prev]);
            }
        }

        setLogs(prev => [`Completed ${newOutcomes.length} simulations`, ...prev]);

        // 4. Train model
        if (newOutcomes.length > 0) {
            const result = await LearningEngine.trainModel();
            setWeights(result.newWeights);
            const updatedOutcomes = await TransferTracker.getOutcomes();
            setOutcomes(updatedOutcomes);

            result.improvements.forEach(imp => {
                setLogs(prev => [`[LEARNING] ${imp}`, ...prev]);
            });
        }

        setIsTraining(false);
    };

    const runSeasonSimulation = async () => {
        setIsTraining(true);
        setLogs(prev => ['🚀 Starting full season simulation...', ...prev]);

        await new Promise(resolve => setTimeout(resolve, 500));

        const currentWeights = weights || await LearningEngine.getCurrentWeights();

        // Determine valid gameweek range
        let maxGw = 1;
        Object.values(playerHistories).forEach((h: any) => {
            if (h.history && h.history.length > 0) {
                const last = h.history[h.history.length - 1].round;
                if (last > maxGw) maxGw = last;
            }
        });

        const minStartGw = 4; // Need 3 weeks of history for form
        const maxStartGw = Math.max(minStartGw, maxGw - 3); // Need 3 weeks for outcome evaluation
        const scenariosPerGw = 5;

        setLogs(prev => [`📊 Training from GW${minStartGw} to GW${maxStartGw} (${maxStartGw - minStartGw + 1} gameweeks)`, ...prev]);

        let totalSimulations = 0;
        let updatedWeights = currentWeights;

        // Iterate through each gameweek
        for (let gw = minStartGw; gw <= maxStartGw; gw++) {
            const gwOutcomes: TransferOutcome[] = [];

            // Run multiple scenarios for this gameweek
            for (let i = 0; i < scenariosPerGw; i++) {
                // Use top 200 players by total points for more realistic scenarios
                const topPlayers = allPlayers
                    .filter(p => playerHistories[p.id]?.history?.length > 0)
                    .sort((a, b) => b.total_points - a.total_points)
                    .slice(0, 200);

                if (topPlayers.length < 20) {
                    setLogs(prev => ['⚠️ Error: Not enough player history data', ...prev]);
                    break;
                }

                // Shuffle top players and pick 15 for team, rest for market
                const shuffled = topPlayers.sort(() => 0.5 - Math.random());
                const team = shuffled.slice(0, 15);
                const market = shuffled.slice(15);

                const scenario: SimulationScenario = {
                    gameweek: gw,
                    team,
                    market,
                    budget: 1000
                };

                // Run Simulation
                const result = runSimulation(scenario, updatedWeights, playerHistories, fixtures);

                if (result.transferIn && result.transferOut) {
                    const outcome = await TransferTracker.recordOutcome({
                        decisionId: `season-sim-${gw}-${i}-${Date.now()}`,
                        actualPointsGained: result.pointsDiff,
                        weeksEvaluated: 3,
                        successScore: result.success ? 100 : 0
                    });

                    if (outcome) {
                        gwOutcomes.push(outcome);
                        totalSimulations++;
                    }
                }
            }

            // Train model after each gameweek batch
            if (gwOutcomes.length > 0) {
                const trainingResult = await LearningEngine.trainModel();
                updatedWeights = trainingResult.newWeights;

                setLogs(prev => [
                    `✅ GW${gw}: ${gwOutcomes.length} simulations completed. Model updated.`,
                    ...prev
                ]);
            } else {
                setLogs(prev => [`⚠️ GW${gw}: No suitable transfers found`, ...prev]);
            }

            // Update UI periodically
            if (gw % 3 === 0) {
                setWeights(updatedWeights);
                const updatedOutcomes = await TransferTracker.getOutcomes();
                setOutcomes(updatedOutcomes);
            }
        }

        // Final update
        setWeights(updatedWeights);
        const finalOutcomes = await TransferTracker.getOutcomes();
        setOutcomes(finalOutcomes);

        setLogs(prev => [
            `🎉 Season simulation complete! ${totalSimulations} total scenarios analyzed.`,
            `📈 Model trained on ${maxStartGw - minStartGw + 1} gameweeks of historical data.`,
            ...prev
        ]);

        setIsTraining(false);
    };

    const resetModel = async () => {
        await LearningEngine.resetWeights();
        await TransferTracker.clearData();
        const defaultWeights = await LearningEngine.getCurrentWeights();
        setWeights(defaultWeights);
        setOutcomes([]);
        setLogs(prev => ['Model reset to default', ...prev]);
    };

    if (!weights) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Model State */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-600" />
                            Current Model Weights
                        </CardTitle>
                        <CardDescription>The brain of the transfer algorithm</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Form Importance</span>
                                <span className="font-bold">{(weights.formWeight * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={weights.formWeight * 100} className="h-2" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Fixture Importance</span>
                                <span className="font-bold">{(weights.fixtureWeight * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={weights.fixtureWeight * 100} className="h-2" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>ICT Index Importance</span>
                                <span className="font-bold">{(weights.ictWeight * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={weights.ictWeight * 100} className="h-2" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Price/Value Importance</span>
                                <span className="font-bold">{(weights.priceWeight * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={weights.priceWeight * 100} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                {/* Training Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-blue-600" />
                            Training Simulation
                        </CardTitle>
                        <CardDescription>Run simulations to improve the model</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center py-4">
                            <div className="text-3xl font-bold">{outcomes.length}</div>
                            <div className="text-sm text-muted-foreground">Scenarios Analyzed</div>
                        </div>

                        <Button
                            className="w-full"
                            onClick={runSimulationBatch}
                            disabled={isTraining}
                        >
                            {isTraining ? 'Training...' : (
                                <>
                                    <Play className="mr-2 h-4 w-4" /> Run Simulation (5 Batches)
                                </>
                            )}
                        </Button>

                        <Button
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            onClick={runSeasonSimulation}
                            disabled={isTraining}
                        >
                            {isTraining ? 'Training...' : (
                                <>
                                    <Brain className="mr-2 h-4 w-4" /> Train Season (GW 1-Current)
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full text-red-600 hover:text-red-700"
                            onClick={resetModel}
                            disabled={isTraining}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" /> Reset Model
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Training Log</CardTitle>
                        <CardDescription>Recent learning activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] overflow-y-auto space-y-2 text-sm border rounded p-2 bg-slate-50">
                            {logs.length === 0 && <span className="text-muted-foreground">No activity yet</span>}
                            {logs.map((log, i) => (
                                <div key={i} className="border-b last:border-0 pb-1 last:pb-0">
                                    <span className="text-xs text-muted-foreground block">{new Date().toLocaleTimeString()}</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
