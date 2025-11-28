import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { fetchBootstrapStatic, fetchFixtures, fetchManagerTeam, getCurrentGameweek } from '@/lib/fpl-api';
import { optimizeLineup } from '@/lib/optimization';
import { LineupControls } from '@/components/lineup-controls';
import { getBestTransfer } from '@/lib/transfer-recommendation';
import { Badge } from '@/components/ui/badge';

// Helper to get squad players (15) from manager team
async function getLineupData(teamId: number) {
    const [bootstrap, fixtures] = await Promise.all([
        fetchBootstrapStatic(),
        fetchFixtures(),
    ]);
    const currentGameweek = getCurrentGameweek(bootstrap.events);
    const managerTeam = await fetchManagerTeam(teamId, currentGameweek);
    const squadPlayerIds = managerTeam.picks.map(p => p.element);
    const squadPlayers = bootstrap.elements.filter(p => squadPlayerIds.includes(p.id));
    return { squadPlayers, fixtures, allPlayers: bootstrap.elements };
}

export default async function LineupPage({
    searchParams,
}: {
    searchParams: Promise<{ teamId?: string; includeTransfer?: string }>;
}) {
    const params = await searchParams;
    const teamId = params.teamId ? parseInt(params.teamId) : 3992229; // default
    const includeTransfer = params.includeTransfer === 'true';

    let { squadPlayers, fixtures, allPlayers } = await getLineupData(teamId);
    let transferInfo = null;

    if (includeTransfer) {
        const transfer = getBestTransfer(squadPlayers, allPlayers, fixtures);
        if (transfer) {
            // Apply transfer
            squadPlayers = squadPlayers.map(p => p.id === transfer.transferOut.id ? transfer.transferIn : p);
            transferInfo = transfer;
        }
    }

    // Use default settings (budget not needed for lineup, but we pass dummy values)
    const lineup = optimizeLineup(
        squadPlayers,
        fixtures,
        [], // no historical data needed for a single GW
        undefined // no strategy overrides
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Optimal Lineup</h1>
                    <a href={`/?teamId=${teamId}`} className="text-sm text-muted-foreground hover:underline">
                        ← Back to Dashboard
                    </a>
                </div>

                <LineupControls />

                {transferInfo && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg flex items-center gap-4">
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

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Best Lineup for Next Gameweek</CardTitle>
                        <CardDescription>
                            Formation: {lineup.formation} – Expected Points: {lineup.totalExpectedPoints.toFixed(1)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <h3 className="font-semibold mb-2">Starters (Captain marked ★)</h3>
                        <ul className="list-disc list-inside mb-4">
                            {lineup.starters.map(p => (
                                <li key={p.id}>
                                    {p.web_name} ({p.element_type === 1 ? 'GK' : p.element_type === 2 ? 'DEF' : p.element_type === 3 ? 'MID' : 'FWD'}) – {p.xP.toFixed(1)} pts {p.id === lineup.captain.id && '★'}
                                </li>
                            ))}
                        </ul>
                        <h3 className="font-semibold mb-2">Bench</h3>
                        <ul className="list-disc list-inside">
                            {lineup.bench.map(p => (
                                <li key={p.id}>
                                    {p.web_name} ({p.element_type === 1 ? 'GK' : p.element_type === 2 ? 'DEF' : p.element_type === 3 ? 'MID' : 'FWD'}) – {p.xP.toFixed(1)} pts
                                </li>
                            ))}
                        </ul>
                        <Separator className="my-4" />
                        <p className="text-sm text-muted-foreground">
                            Captain: {lineup.captain.web_name} – Vice‑Captain: {lineup.viceCaptain.web_name}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
