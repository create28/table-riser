import { Player, Team, Fixture } from '@/lib/fpl-api';
import { analyzePlayerPerformance, categorizePerformance, PerformanceBreakdown, PerformanceInsight } from '@/lib/player-analysis-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Home, Plane } from 'lucide-react';

interface PlayerPerformanceAnalysisProps {
    player: Player;
    playerHistory: any;
    fixtures: Fixture[];
    teams: Team[];
}

export function PlayerPerformanceAnalysis({
    player,
    playerHistory,
    fixtures,
    teams
}: PlayerPerformanceAnalysisProps) {
    const breakdown = analyzePlayerPerformance(player, playerHistory, fixtures, teams);
    const insights = categorizePerformance(breakdown);

    if (breakdown.overall.totalGames < 3) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Performance Analysis</CardTitle>
                    <CardDescription>Breakdown by fixture difficulty and location</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Insufficient data for analysis (minimum 3 games required)
                    </p>
                </CardContent>
            </Card>
        );
    }

    const getColorForPoints = (points: number, avg: number) => {
        if (points === 0) return 'bg-gray-100 text-gray-400';
        const diff = ((points - avg) / avg) * 100;
        if (diff > 20) return 'bg-green-100 text-green-800 font-semibold';
        if (diff > 0) return 'bg-green-50 text-green-700';
        if (diff > -20) return 'bg-orange-50 text-orange-700';
        return 'bg-red-100 text-red-800';
    };

    const overallAvg = (breakdown.overall.homeAvg + breakdown.overall.awayAvg) / 2;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Performance Analysis</CardTitle>
                    <CardDescription>Breakdown by fixture difficulty and location</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Key Insights */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Key Insights</h4>
                        <div className="space-y-2">
                            {insights.map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    {insight.type === 'strength' && <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />}
                                    {insight.type === 'weakness' && <TrendingDown className="h-4 w-4 text-red-600 mt-0.5" />}
                                    {insight.type === 'neutral' && <Minus className="h-4 w-4 text-gray-600 mt-0.5" />}
                                    <p className="text-sm">{insight.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Performance Matrix */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Performance Matrix (Avg Points)</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 px-3">Difficulty</th>
                                        <th className="text-center py-2 px-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <Home className="h-3 w-3" />
                                                <span>Home</span>
                                            </div>
                                        </th>
                                        <th className="text-center py-2 px-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <Plane className="h-3 w-3" />
                                                <span>Away</span>
                                            </div>
                                        </th>
                                        <th className="text-center py-2 px-3">Games</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { key: 'fdr1', label: 'FDR 1 (Easy)' },
                                        { key: 'fdr2', label: 'FDR 2' },
                                        { key: 'fdr3', label: 'FDR 3' },
                                        { key: 'fdr4', label: 'FDR 4' },
                                        { key: 'fdr5', label: 'FDR 5 (Hard)' }
                                    ].map(({ key, label }) => {
                                        const data = breakdown[key as keyof Omit<PerformanceBreakdown, 'overall'>];
                                        return (
                                            <tr key={key} className="border-b">
                                                <td className="py-2 px-3 font-medium">{label}</td>
                                                <td className="text-center py-2 px-3">
                                                    {data.count > 0 && data.home > 0 ? (
                                                        <span className={`inline-block px-2 py-1 rounded text-xs ${getColorForPoints(data.home, overallAvg)}`}>
                                                            {data.home.toFixed(1)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="text-center py-2 px-3">
                                                    {data.count > 0 && data.away > 0 ? (
                                                        <span className={`inline-block px-2 py-1 rounded text-xs ${getColorForPoints(data.away, overallAvg)}`}>
                                                            {data.away.toFixed(1)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="text-center py-2 px-3 text-xs text-muted-foreground">
                                                    {data.count}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="font-semibold bg-muted/50">
                                        <td className="py-2 px-3">Overall</td>
                                        <td className="text-center py-2 px-3">
                                            <span className="inline-block px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                                {breakdown.overall.homeAvg.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="text-center py-2 px-3">
                                            <span className="inline-block px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                                {breakdown.overall.awayAvg.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="text-center py-2 px-3 text-xs">
                                            {breakdown.overall.totalGames}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold">Color Legend:</p>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="bg-green-100 text-green-800">+20% above average</Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700">Above average</Badge>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700">Below average</Badge>
                            <Badge variant="outline" className="bg-red-100 text-red-800">-20% below average</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
