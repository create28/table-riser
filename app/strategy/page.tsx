import { Suspense } from 'react';
import { 
  fetchBootstrapStatic, 
  fetchFixtures, 
  fetchManagerTeam,
  fetchManagerInfo,
  fetchPlayerHistory,
  Player,
  Team,
  Fixture
} from '@/lib/fpl-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { TransferStrategyClient } from '@/components/transfer-strategy-client';
import { PlayerDetailProvider } from '@/components/player-detail-provider';
import { StrategyPlayerModal } from '@/components/strategy-player-modal';
import { StrategyWrapper } from '@/components/strategy-wrapper';

const DEFAULT_TEAM_ID = 3992229;

async function getStrategyData(teamId: number) {
  try {
    const [bootstrapData, fixtures, managerInfo] = await Promise.all([
      fetchBootstrapStatic(),
      fetchFixtures(),
      fetchManagerInfo(teamId),
    ]);

    const currentGameweek = bootstrapData.events.find(e => e.is_current)?.id || 1;
    
    // Fetch manager team after we know the current gameweek
    const managerTeam = await fetchManagerTeam(teamId, currentGameweek);
    const nextGameweeks = bootstrapData.events.filter(
      e => e.id > currentGameweek && e.id <= currentGameweek + 5
    );

    // Get current squad player IDs
    const squadPlayerIds = new Set(managerTeam.picks.map(p => p.element));

    // Get full player objects for squad
    const squadPlayers = bootstrapData.elements.filter(p => 
      squadPlayerIds.has(p.id)
    );

    // Get all players sorted by total points (top 100 as potential targets)
    const allPlayers = [...bootstrapData.elements]
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 100);

    // Fetch player histories for all potential transfer targets
    // Filter: players with playing time who could be transfer targets
    const potentialTransferTargets = bootstrapData.elements.filter(p => 
      p.minutes > 100 && // Has played
      p.chance_of_playing_next_round !== 0 // Not injured
    );

    // Combine squad players + all potential targets
    const playersToAnalyze = new Set([
      ...squadPlayers.map(p => p.id),
      ...potentialTransferTargets.map(p => p.id)
    ]);

    console.log(`Fetching histories for ${playersToAnalyze.size} players...`);

    const playerHistories: { [key: number]: any } = {};
    
    // Fetch in batches to avoid overwhelming the API
    const playerIdArray = Array.from(playersToAnalyze);
    const batchSize = 20;
    
    for (let i = 0; i < playerIdArray.length; i += batchSize) {
      const batch = playerIdArray.slice(i, i + batchSize);
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

    console.log(`Successfully fetched ${Object.keys(playerHistories).length} player histories`);

    return {
      teams: bootstrapData.teams,
      squadPlayers,
      allPlayers: bootstrapData.elements,
      fixtures,
      currentGameweek,
      nextGameweeks,
      playerHistories,
      managerTeam,
      managerInfo,
    };
  } catch (error) {
    console.error('Error fetching strategy data:', error);
    throw error;
  }
}

function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading Transfer Strategy...</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string }>;
}) {
  const params = await searchParams;
  const teamId = params.teamId ? parseInt(params.teamId) : DEFAULT_TEAM_ID;
  const data = await getStrategyData(teamId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link 
              href={`/?teamId=${teamId}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-amber-600 to-orange-600 bg-clip-text text-transparent">
            5-Week Transfer Strategy
          </h1>
          <p className="text-muted-foreground text-lg">
            Strategic transfer planning based on fixtures, form, and your risk appetite
          </p>

          {/* Team ID Input */}
          <StrategyWrapper currentTeamId={teamId} />
        </div>

        {/* Strategy Component */}
        <Suspense fallback={<LoadingCard />}>
          <PlayerDetailProvider>
            <TransferStrategyClient
              teams={data.teams}
              squadPlayers={data.squadPlayers}
              allPlayers={data.allPlayers}
              fixtures={data.fixtures}
              currentGameweek={data.currentGameweek}
              nextGameweeks={data.nextGameweeks}
              playerHistories={data.playerHistories}
              managerTeam={data.managerTeam}
              managerInfo={data.managerInfo}
            />
            <StrategyPlayerModal 
              teams={data.teams}
              playerHistories={data.playerHistories}
            />
          </PlayerDetailProvider>
        </Suspense>
      </div>
    </div>
  );
}

