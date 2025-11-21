import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { fetchBootstrapStatic, fetchFixtures, fetchManagerTeam, fetchManagerInfo, getCurrentGameweek } from '@/lib/fpl-api';
import { optimizeLineup } from '@/lib/optimization';

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
    return { squadPlayers, fixtures };
}

export default async function LineupPage({
    searchParams,
}: {
    searchParams: Promise<{ teamId?: string }>;
}) {
    const params = await searchParams;
    const teamId = params.teamId ? parseInt(params.teamId) : 3992229; // default
    const { squadPlayers, fixtures } = await getLineupData(teamId);

    // Use default settings (budget not needed for lineup, but we pass dummy values)
    const lineup = optimizeLineup(
        squadPlayers,
        fixtures,
        [], // no historical data needed for a single GW
        undefined // no strategy overrides
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
            <Card className="max-w-4xl mx-auto">
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
                                {p.web_name} ({p.position}) – {p.xP.toFixed(1)} pts {p.id === lineup.captain.id && '★'}
                            </li>
                        ))}
                    </ul>
                    <h3 className="font-semibold mb-2">Bench</h3>
                    <ul className="list-disc list-inside">
                        {lineup.bench.map(p => (
                            <li key={p.id}>
                                {p.web_name} ({p.position}) – {p.xP.toFixed(1)} pts
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
    );
}
