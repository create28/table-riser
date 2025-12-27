'use client';

// Re-exporting as server component wrapper
import { Suspense } from 'react';
import { fetchBootstrapStatic, fetchManagerTeam, fetchManagerInfo, getCurrentGameweek, fetchPlayerHistory, fetchFixtures } from '@/lib/fpl-api';
import { DashboardClient } from '@/components/dashboard-client';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DashboardWrapper } from '@/components/dashboard-wrapper';
import { Loader2 } from 'lucide-react';

const DEFAULT_TEAM_ID = 3992229;

async function getDashboardData(teamId: number) {
  try {
    // Fetch critical data in parallel
    const [bootstrapData, fixtures] = await Promise.all([
      fetchBootstrapStatic(),
      fetchFixtures(),
    ]);

    const currentGameweek = getCurrentGameweek(bootstrapData.events);

    // Fetch manager's team for current gameweek
    const managerTeam = await fetchManagerTeam(teamId, currentGameweek);
    const managerInfo = await fetchManagerInfo(teamId);

    // Get player IDs from manager's team
    const playerIds = managerTeam.picks.map((pick: any) => pick.element);
    const playerIdsSet = new Set(playerIds);

    // Get full player details
    const teamPlayers = bootstrapData.elements.filter((player: any) =>
      playerIds.includes(player.id)
    );

    // Get unique team IDs from players
    const playerTeams = teamPlayers.map((player: any) => player.team);

    // Fetch player histories for all visible players on the dashboard
    // This includes squad players + top performers shown in various components
    const playersToFetchHistory = new Set<number>();

    // Add squad players
    teamPlayers.forEach((p: any) => playersToFetchHistory.add(p.id));

    // CRITICAL FIX: Drastically reduced to prevent browser freezing
    // Only fetch histories for squad + absolute essentials
    const topByPoints = [...bootstrapData.elements]
      .sort((a: any, b: any) => b.total_points - a.total_points)
      .slice(0, 20); // Reduced from 50 to 20
    topByPoints.forEach((p: any) => playersToFetchHistory.add(p.id));

    // CRITICAL FIX: Reduced from 30 to 15 by form
    const topByForm = [...bootstrapData.elements]
      .filter((p: any) => p.minutes > 300)
      .sort((a: any, b: any) => parseFloat(b.form) - parseFloat(a.form))
      .slice(0, 15);
    topByForm.forEach((p: any) => playersToFetchHistory.add(p.id));

    // CRITICAL FIX: Reduced from 30 to 15 by value
    const topByValue = [...bootstrapData.elements]
      .filter((p: any) => p.total_points > 0 && p.minutes > 300)
      .sort((a: any, b: any) => {
        const valueA = a.total_points / (a.now_cost / 10);
        const valueB = b.total_points / (b.now_cost / 10);
        return valueB - valueA;
      })
      .slice(0, 15);
    topByValue.forEach((p: any) => playersToFetchHistory.add(p.id));

    console.log(`Fetching player histories for ${playersToFetchHistory.size} players...`);

    // CRITICAL FIX: Further reduced batch size and added delays
    const playerHistories: { [key: number]: any } = {};
    const allPlayerIdsToFetch = Array.from(playersToFetchHistory);
    const BATCH_SIZE = 5; // Reduced from 10 to 5 to prevent overload
    
    for (let i = 0; i < allPlayerIdsToFetch.length; i += BATCH_SIZE) {
      const batch = allPlayerIdsToFetch.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (playerId) => {
          try {
            const history = await fetchPlayerHistory(playerId);
            playerHistories[playerId] = history;
          } catch (error) {
            console.error(`Failed to fetch history for player ${playerId}:`, error);
            playerHistories[playerId] = { history: [] };
          }
        })
      );
    }

    return {
      players: teamPlayers,
      allPlayers: bootstrapData.elements, // All players for transfer suggestions
      teams: bootstrapData.teams,
      fixtures,
      events: bootstrapData.events,
      playerTeams,
      managerInfo,
      managerTeam, // Return full manager team object
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
          events={data.events}
          playerTeams={data.playerTeams}
          playerHistories={data.playerHistories}
          squadPlayerIds={data.squadPlayerIds}
          managerInfo={data.managerInfo}
          managerTeam={data.managerTeam}
          teamId={teamId}
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
