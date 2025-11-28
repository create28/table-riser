import { Suspense } from 'react';
import { fetchBootstrapStatic, fetchManagerTeam, fetchManagerInfo, getCurrentGameweek, fetchPlayerHistory } from '@/lib/fpl-api';
import { DashboardClient } from '@/components/dashboard-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { fetchFixtures } from '@/lib/fpl-api';
import { DashboardWrapper } from '@/components/dashboard-wrapper';

const DEFAULT_TEAM_ID = 3992229;

async function getDashboardData(teamId: number) {
  try {
    // Fetch all data in parallel
    const [bootstrapData, fixtures] = await Promise.all([
      fetchBootstrapStatic(),
      fetchFixtures(),
    ]);

    const currentGameweek = getCurrentGameweek(bootstrapData.events);

    // Fetch manager's team for current gameweek
    const managerTeam = await fetchManagerTeam(teamId, currentGameweek);
    const managerInfo = await fetchManagerInfo(teamId);

    // Get player IDs from manager's team
    const playerIds = managerTeam.picks.map(pick => pick.element);
    const playerIdsSet = new Set(playerIds);

    // Get full player details
    const teamPlayers = bootstrapData.elements.filter(player =>
      playerIds.includes(player.id)
    );

    // Get unique team IDs from players
    const playerTeams = teamPlayers.map(player => player.team);

    // Fetch player histories for all visible players on the dashboard
    // This includes squad players + top performers shown in various components
    const playersToFetchHistory = new Set<number>();

    // Add squad players
    teamPlayers.forEach(p => playersToFetchHistory.add(p.id));

    // Add top 100 by points (shown in various tables)
    const topByPoints = [...bootstrapData.elements]
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 100);
    topByPoints.forEach(p => playersToFetchHistory.add(p.id));

    // Add top 50 by form (shown in PlayerForm component)
    const topByForm = [...bootstrapData.elements]
      .filter(p => p.minutes > 300)
      .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
      .slice(0, 50);
    topByForm.forEach(p => playersToFetchHistory.add(p.id));

    // Add top 50 by value efficiency (shown in ValueEfficiency component)
    const topByValue = [...bootstrapData.elements]
      .filter(p => p.total_points > 0 && p.minutes > 300)
      .sort((a, b) => {
        const valueA = a.total_points / (a.now_cost / 10);
        const valueB = b.total_points / (b.now_cost / 10);
        return valueB - valueA;
      })
      .slice(0, 50);
    topByValue.forEach(p => playersToFetchHistory.add(p.id));

    console.log(`Fetching player histories for ${playersToFetchHistory.size} players...`);

    const playerHistories: { [key: number]: any } = {};
    await Promise.all(
      Array.from(playersToFetchHistory).map(async (playerId) => {
        try {
          const history = await fetchPlayerHistory(playerId);
          playerHistories[playerId] = history;
        } catch (error) {
          console.error(`Failed to fetch history for player ${playerId}:`, error);
          playerHistories[playerId] = { history: [] };
        }
      })
    );

    return {
      players: teamPlayers,
      allPlayers: bootstrapData.elements, // All players for transfer suggestions
      teams: bootstrapData.teams,
      fixtures,
      playerTeams,
      managerInfo,
      currentGameweek,
      entryHistory: managerTeam.entry_history,
      playerHistories,
      squadPlayerIds: playerIdsSet, // For visual distinction
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string }>;
}) {
  const params = await searchParams;
  const teamId = params.teamId ? parseInt(params.teamId) : DEFAULT_TEAM_ID;
  const data = await getDashboardData(teamId);

  return (
    <DashboardWrapper
      initialTeamId={teamId}
      managerInfo={data.managerInfo}
      entryHistory={data.entryHistory}
    >
      <Separator />

      {/* Dashboard Components with Interactive Player Details */}
      <Suspense fallback={<LoadingCard />}>
        <DashboardClient
          players={data.players}
          allPlayers={data.allPlayers}
          teams={data.teams}
          fixtures={data.fixtures}
          playerTeams={data.playerTeams}
          playerHistories={data.playerHistories}
          squadPlayerIds={data.squadPlayerIds}
        />
      </Suspense>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-8">
        <p>Data from Fantasy Premier League API</p>
        <p className="mt-1">Last updated: Gameweek {data.currentGameweek}</p>
      </div>
    </DashboardWrapper>
  );
}
