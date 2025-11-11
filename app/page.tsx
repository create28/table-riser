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

    // Fetch player histories for all squad players
    // For volatility analysis, we'll also include top performers (limit to reasonable number for performance)
    const topPlayersByPoints = [...bootstrapData.elements]
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 50); // Top 50 players by points
    
    const playersToFetchHistory = new Set([
      ...teamPlayers.map(p => p.id),
      ...topPlayersByPoints.map(p => p.id)
    ]);

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
    <DashboardWrapper initialTeamId={teamId}>
      {/* Manager Info Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">{data.managerInfo.name}</CardTitle>
          <CardDescription>
            Team: {data.managerInfo.player_first_name} {data.managerInfo.player_last_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Overall Rank</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-500">
                {data.entryHistory.overall_rank.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-500">
                {data.entryHistory.total_points}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">GW{data.currentGameweek} Points</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">
                {data.entryHistory.points}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Value</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-500">
                £{(data.entryHistory.value / 10).toFixed(1)}m
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
