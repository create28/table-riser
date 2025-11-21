'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Player, Team, Fixture } from '@/lib/fpl-api';
import { optimizeTeam, OptimizedTeam, PlayerWithXP } from '@/lib/optimization';
import { loadHistoricalData, HistoricalSeasonData } from '@/lib/historical-data';
import { Separator } from '@/components/ui/separator';
import { Loader2, Wand2, CalendarDays } from 'lucide-react';

interface OptimizationToolsProps {
    allPlayers: Player[];
    fixtures: Fixture[];
    teams: Team[];
    currentBudget: number;
}

export function OptimizationTools({ allPlayers, fixtures, teams, currentBudget }: OptimizationToolsProps) {
    const [optimizedTeam, setOptimizedTeam] = useState<OptimizedTeam | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [activeTab, setActiveTab] = useState<'freehit' | 'wildcard'>('freehit');
    const [historicalData, setHistoricalData] = useState<HistoricalSeasonData[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const handleOptimize = async () => {
        setIsOptimizing(true);

        let currentHistory = historicalData;

        // Load historical data if not already loaded
        if (currentHistory.length === 0) {
            setIsLoadingHistory(true);
            try {
                currentHistory = await loadHistoricalData();
                setHistoricalData(currentHistory);
            } catch (error) {
                console.error("Failed to load historical data", error);
            } finally {
                setIsLoadingHistory(false);
            }
        }

        // Small delay to allow UI to update
        setTimeout(() => {
            const gameweeks = activeTab === 'freehit' ? 1 : 5;
            const result = optimizeTeam(allPlayers, fixtures, {
                budget: 1000, // Standard 100m budget for chips usually, or use currentBudget
                gameweeks,
                excludePlayers: [],
                includePlayers: [],
                historicalData: currentHistory
            });

            setOptimizedTeam(result);
            setIsOptimizing(false);
        }, 100);
    };

    const getTeamName = (teamId: number) => {
        return teams.find(t => t.id === teamId)?.short_name || 'UNK';
    };

    const renderPlayerRow = (player: PlayerWithXP, isCaptain: boolean = false, isVice: boolean = false) => (
        <div key={player.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex items-center gap-3">
                <div className="w-8 text-xs font-bold text-muted-foreground">
                    {player.element_type === 1 ? 'GKP' : player.element_type === 2 ? 'DEF' : player.element_type === 3 ? 'MID' : 'FWD'}
                </div>
                <div>
                    <div className="font-medium flex items-center gap-2">
                        {player.web_name}
                        {isCaptain && <Badge variant="default" className="h-5 px-1.5 text-[10px]">C</Badge>}
                        {isVice && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">V</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{getTeamName(player.team)}</div>
                </div>
            </div>
            <div className="text-right">
                <div className="font-bold">{player.xP?.toFixed(1)} xP</div>
                <div className="text-xs text-muted-foreground">£{(player.now_cost / 10).toFixed(1)}m</div>
            </div>
        </div>
    );

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    Chip Optimizer
                </CardTitle>
                <CardDescription>
                    AI-powered team selection for Free Hit and Wildcard chips
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="freehit">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                Free Hit (1 GW)
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="wildcard">
                            <div className="flex items-center gap-2">
                                <Wand2 className="h-4 w-4" />
                                Perfect Wildcard (5 GWs)
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <div className="space-y-6">
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">
                                {activeTab === 'freehit' ? 'Free Hit Strategy' : 'Wildcard Strategy'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {activeTab === 'freehit'
                                    ? 'Optimizes for the absolute maximum points in the upcoming gameweek only. Ignores long-term value and upcoming fixtures beyond the next match.'
                                    : 'Builds a balanced squad optimized for the next 5 gameweeks. Balances immediate points with long-term stability and fixture difficulty.'}
                            </p>

                            <Button
                                onClick={handleOptimize}
                                disabled={isOptimizing}
                                className="w-full"
                                size="lg"
                            >
                                {isOptimizing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isLoadingHistory ? 'Loading Historical Data...' : 'Optimizing Team...'}
                                    </>
                                ) : (
                                    `Generate ${activeTab === 'freehit' ? 'Free Hit' : 'Wildcard'} Team`
                                )}
                            </Button>
                        </div>

                        {optimizedTeam && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Projected Points</div>
                                        <div className="text-2xl font-bold text-primary">
                                            {optimizedTeam.totalExpectedPoints.toFixed(1)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-muted-foreground">Total Cost</div>
                                        <div className="text-2xl font-bold">
                                            £{(optimizedTeam.totalCost / 10).toFixed(1)}m
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Starting XI</h4>
                                        <div className="bg-card border rounded-lg p-4 shadow-sm">
                                            {optimizedTeam.starters.map(player =>
                                                renderPlayerRow(
                                                    player,
                                                    player.id === optimizedTeam.captain.id,
                                                    player.id === optimizedTeam.viceCaptain.id
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Bench</h4>
                                        <div className="bg-muted/30 border rounded-lg p-4">
                                            {optimizedTeam.bench.map(player => renderPlayerRow(player))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}
