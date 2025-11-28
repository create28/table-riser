'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Player, Team, Fixture } from '@/lib/fpl-api';
import { optimizeLineup } from '@/lib/optimization';
import { getBestTransfer } from '@/lib/transfer-recommendation';

interface BestLineupProps {
    squadPlayers: Player[];
    allPlayers: Player[];
    fixtures: Fixture[];
    teams: Team[];
}

export function BestLineup({ squadPlayers, allPlayers, fixtures, teams }: BestLineupProps) {
    const [includeTransfer, setIncludeTransfer] = useState(false);

    // Memoize calculations to avoid re-running on every render
    const { lineup, transferInfo } = useMemo(() => {
        let currentSquad = [...squadPlayers];
        let transfer = null;

        if (includeTransfer) {
            transfer = getBestTransfer(currentSquad, allPlayers, fixtures);
            if (transfer) {
                // Apply transfer to a copy of the squad
                currentSquad = currentSquad.map(p => p.id === transfer!.transferOut.id ? transfer!.transferIn : p);
            }
        }

        const optimized = optimizeLineup(
            currentSquad,
            fixtures,
            [], // no historical data needed for a single GW
            undefined // no strategy overrides
        );

        return { lineup: optimized, transferInfo: transfer };
    }, [squadPlayers, allPlayers, fixtures, includeTransfer]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                <div className="space-y-0.5">
                    <Label htmlFor="transfer-mode" className="text-base font-medium">
                        Include Suggested Transfer
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Optimize lineup assuming you make the best recommended transfer
                    </p>
                </div>
                <Switch
                    id="transfer-mode"
                    checked={includeTransfer}
                    onCheckedChange={setIncludeTransfer}
                />
            </div>

            {includeTransfer && transferInfo && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1">
                        <p className="font-semibold text-blue-800 dark:text-blue-300">Suggested Transfer Applied:</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="destructive" className="bg-red-500">OUT</Badge>
                            <span>{transferInfo.transferOut.web_name}</span>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">IN</Badge>
                            <span className="font-bold">{transferInfo.transferIn.web_name}</span>
                        </div>
                    </div>
                </div>
            )}

            {includeTransfer && !transferInfo && (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                    <p className="text-yellow-800 dark:text-yellow-300">No beneficial transfer found for this week.</p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Best Lineup for Next Gameweek</CardTitle>
                    <CardDescription>
                        Formation: {lineup.formation} – Expected Points: {lineup.totalExpectedPoints.toFixed(1)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded text-xs">XI</span>
                                Starters
                            </h3>
                            <ul className="space-y-2">
                                {lineup.starters.map(p => (
                                    <li key={p.id} className="flex justify-between items-center p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-muted-foreground w-8">
                                                {p.element_type === 1 ? 'GKP' : p.element_type === 2 ? 'DEF' : p.element_type === 3 ? 'MID' : 'FWD'}
                                            </span>
                                            <span className={p.id === lineup.captain.id ? "font-bold" : ""}>
                                                {p.web_name}
                                            </span>
                                            {p.id === lineup.captain.id && <Badge variant="secondary" className="text-[10px] h-4 px-1">C</Badge>}
                                            {p.id === lineup.viceCaptain.id && <Badge variant="outline" className="text-[10px] h-4 px-1">VC</Badge>}
                                        </div>
                                        <span className="font-mono font-medium">{p.xP.toFixed(1)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded text-xs">BENCH</span>
                                Substitutes
                            </h3>
                            <ul className="space-y-2">
                                {lineup.bench.map((p, i) => (
                                    <li key={p.id} className="flex justify-between items-center p-2 rounded border border-dashed hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-muted-foreground w-8">
                                                {i === 0 ? 'GK' : `Sub ${i}`}
                                            </span>
                                            <span className="text-muted-foreground">{p.web_name}</span>
                                        </div>
                                        <span className="font-mono text-muted-foreground">{p.xP.toFixed(1)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/20 p-3 rounded">
                        <div>
                            Captain: <span className="font-medium text-foreground">{lineup.captain.web_name}</span>
                        </div>
                        <div>
                            Vice-Captain: <span className="font-medium text-foreground">{lineup.viceCaptain.web_name}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
