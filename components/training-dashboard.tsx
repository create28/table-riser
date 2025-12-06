'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, RotateCcw, Brain, Database, Search, Loader2 } from 'lucide-react';
import { LearningEngine, AlgorithmWeights } from '@/lib/ml-learning-engine';
import { TransferTracker, TransferOutcome } from '@/lib/ml-transfer-tracker';
import { Player, Fixture } from '@/lib/fpl-api';
import { runSimulation, reconstructPlayerState, SimulationScenario, SimulationResult } from '@/lib/simulation-utils';
import { MetricScout, AVAILABLE_METRICS, MetricCorrelation } from '@/lib/metric-engine';

export function TrainingDashboard({
    allPlayers,
    playerHistories,
    fixtures
}: {
    allPlayers: Player[],
    playerHistories: { [key: number]: any },
    fixtures: Fixture[]
}) {
    const [weights, setWeights] = useState<AlgorithmWeights | null>(null);
    const [outcomes, setOutcomes] = useState<TransferOutcome[]>([]);
    const [isTraining, setIsTraining] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Metric Scout State
    const [isScouting, setIsScouting] = useState(false);
    const [correlations, setCorrelations] = useState<MetricCorrelation[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const w = await LearningEngine.getCurrentWeights();
        setWeights(w);
        const o = await TransferTracker.getOutcomes();
        setOutcomes(o);
    };

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
                // 1. Track the decision first
                const decision = await TransferTracker.trackDecision({
                    gameweek: gameweek,
                    teamId: 0, // Simulation
                    playerOut: result.transferOut,
                    playerIn: result.transferIn,
                    reasoning: {
                        formWeight: currentWeights.formWeight,
                        fixtureWeight: currentWeights.fixtureWeight,
                        ictWeight: currentWeights.ictWeight,
                        priceWeight: currentWeights.priceWeight,
                        score: result.predictedPoints
                    }
                });

                // 2. Record Outcome
                const outcome = await TransferTracker.recordOutcome({
                    decisionId: decision.id,
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
            if (result.success) {
                setWeights(result.newWeights);
                setLogs(prev => [`[LEARNING] ${result.message}`, ...prev]);
            } else {
                setLogs(prev => [`[LEARNING] Skipped: ${result.message}`, ...prev]);
            }

            const updatedOutcomes = await TransferTracker.getOutcomes();
            setOutcomes(updatedOutcomes);
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
        const maxStartGw = Math.max(minStartGw, maxGw - 1); // Allow evaluating up to 1 week before
        const scenariosPerGw = 50;

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

                // Determine evaluation period based on available history
                const evaluationPeriod = Math.min(3, maxGw - gw);

                // Run Simulation
                const result = runSimulation(scenario, updatedWeights, playerHistories, fixtures, evaluationPeriod);

                if (result.transferIn && result.transferOut) {
                    // 1. Track the decision first (saves to DB)
                    const decision = await TransferTracker.trackDecision({
                        gameweek: gw,
                        teamId: 0, // Simulation team ID
                        playerOut: result.transferOut,
                        playerIn: result.transferIn,
                        reasoning: {
                            formWeight: updatedWeights.formWeight,
                            fixtureWeight: updatedWeights.fixtureWeight,
                            ictWeight: updatedWeights.ictWeight,
                            priceWeight: updatedWeights.priceWeight,
                            score: result.predictedPoints
                        }
                    });

                    // 2. Record the outcome using the decision ID
                    const outcome = await TransferTracker.recordOutcome({
                        decisionId: decision.id,
                        actualPointsGained: result.pointsDiff,
                        weeksEvaluated: evaluationPeriod,
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
                // Train model
                const trainingResult = await LearningEngine.trainModel();
                if (trainingResult.success) {
                    updatedWeights = trainingResult.newWeights; // Update local variable for next iterations
                    setWeights(trainingResult.newWeights); // Update state for UI
                    setLogs(prev => [`✅ GW${gw}: ${gwOutcomes.length} simulations completed. Model updated. ${trainingResult.message}`, ...prev]);
                } else {
                    setLogs(prev => [`⚠️ GW${gw}: ${gwOutcomes.length} simulations completed. Training skipped: ${trainingResult.message}`, ...prev]);
                }
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
    const runMetricScout = async () => {
        setIsScouting(true);
        setLogs(prev => ['🔍 Starting Metric Scout analysis...', ...prev]);

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const results = MetricScout.analyzeCorrelations(allPlayers, playerHistories);
            setCorrelations(results);
            setLogs(prev => [`✅ Scout analysis complete. Found ${results.length} correlations.`, ...prev]);
        } catch (e) {
            console.error(e);
            setLogs(prev => ['❌ Error running Metric Scout', ...prev]);
        } finally {
            setIsScouting(false);
        }
    };

    const toggleMetric = async (metricId: string) => {
        if (!weights) return;

        const newWeights = { ...weights };
        if (!newWeights.customWeights) newWeights.customWeights = {};

        const isEnabled = newWeights.customWeights[metricId] !== undefined && newWeights.customWeights[metricId] > 0;

        if (isEnabled) {
            // Disable
            delete newWeights.customWeights[metricId];
            setLogs(prev => [`➖ Removed metric: ${metricId}`, ...prev]);
        } else {
            // Enable (start with low weight)
            newWeights.customWeights[metricId] = 0.1;
            setLogs(prev => [`➕ Added metric: ${metricId} to model`, ...prev]);
        }

        // Save to LocalStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('fpl_custom_weights', JSON.stringify(newWeights.customWeights));
        }

        // Update state
        setWeights(newWeights);
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

                        {/* Custom Metrics */}
                        {weights.customWeights && Object.entries(weights.customWeights).map(([key, val]) => {
                            const metricName = AVAILABLE_METRICS.find(m => m.id === key)?.name || key;
                            return (
                                <div key={key} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-purple-600 font-medium">{metricName}</span>
                                        <span className="font-mono">{(val * 100).toFixed(1)}%</span>
                                    </div>
                                    <Progress value={val * 100} className="h-2 bg-purple-100" indicatorClassName="bg-purple-600" />
                                </div>
                            );
                        })}
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
                            variant="secondary"
                            className="w-full"
                            onClick={runMetricScout}
                            disabled={isScouting}
                        >
                            {isScouting ? 'Scouting...' : (
                                <>
                                    <Search className="mr-2 h-4 w-4" /> Run Metric Scout
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

                {/* Insights Summary */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-indigo-600" />
                            Model Insights
                        </CardTitle>
                        <CardDescription>What the AI has learned from {outcomes.length} simulations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Key Findings</h4>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                    <li>
                                        Current strategy heavily favors <strong>{weights.formWeight > weights.fixtureWeight ? 'Recent Form' : 'Upcoming Fixtures'}</strong>
                                        {' '}as the primary predictor of points.
                                    </li>
                                    <li>
                                        The model assigns a <strong>{(weights.priceWeight * 100).toFixed(0)}% importance</strong> to Player Value,
                                        suggesting {weights.priceWeight > 0.1 ? 'budget management is critical' : 'expensive premiums are worth the cost'}.
                                    </li>
                                    <li>
                                        Based on {outcomes.length} scenarios, the AI has stabilized its learning rate to approx <strong>{Math.max(0.05, 0.4 * Math.exp(-outcomes.length / 500)).toFixed(3)}</strong> to refine accuracy.
                                    </li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Strategic Recommendation</h4>
                                <p className="text-sm text-muted-foreground">
                                    {weights.formWeight > 0.4
                                        ? "Focus on transferring in players who have delivered returns in the last 3-4 gameweeks, even if their upcoming fixtures look tough. Form is the dominant factor."
                                        : "Prioritize players with green fixtures. The simulation indicates that 'easy' games are more reliable for points returns than recent hot streaks."}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Metric Scout Results */}
            {correlations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>🔍 Metric Scout Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Analysis of correlation between metrics and points. Higher correlation means better predictive power.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {correlations.map(c => {
                                    const isEnabled = weights?.customWeights?.[c.metricId] !== undefined;
                                    return (
                                        <div key={c.metricId} className="p-4 border rounded-lg flex flex-col justify-between bg-card hover:bg-accent/5 transition-colors">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-semibold">{c.name}</h4>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${c.correlation > 0.5 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        Corr: {c.correlation.toFixed(2)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-4">
                                                    Based on {c.sampleSize} data points
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={isEnabled ? "destructive" : "default"}
                                                onClick={() => toggleMetric(c.metricId)}
                                            >
                                                {isEnabled ? 'Remove from Model' : 'Add to Model'}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
