'use client';

import { useState, lazy, Suspense } from 'react';
import { Player, Team, Event } from '@/lib/fpl-api';
import { PlayerDetailModal } from '@/components/player-detail-modal';
import { PlayerForm } from '@/components/player-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerPerformance } from '@/components/player-performance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerDetailProvider } from '@/components/player-detail-provider';
import { Loader2 } from 'lucide-react';

// CRITICAL PERFORMANCE FIX: Lazy load heavy components
// Only load when user clicks the tab
const TransferStrategyClient = lazy(() => import('@/components/transfer-strategy-client').then(m => ({ default: m.TransferStrategyClient })));
const PlayerVsTeam = lazy(() => import('@/components/player-vs-team').then(m => ({ default: m.PlayerVsTeam })));
const PlayerVolatility = lazy(() => import('@/components/player-volatility').then(m => ({ default: m.PlayerVolatility })));
const OptimizationTools = lazy(() => import('@/components/optimization-tools').then(m => ({ default: m.OptimizationTools })));
const OverperformersList = lazy(() => import('@/components/overperformers-list').then(m => ({ default: m.OverperformersList })));
const UnderperformersList = lazy(() => import('@/components/underperformers-list').then(m => ({ default: m.UnderperformersList })));
const ChipStrategy = lazy(() => import('@/components/chip-strategy').then(m => ({ default: m.ChipStrategy })));
const BestLineup = lazy(() => import('@/components/best-lineup').then(m => ({ default: m.BestLineup })));
const StrategyPlayerModal = lazy(() => import('@/components/strategy-player-modal').then(m => ({ default: m.StrategyPlayerModal })));

// Import getChipStrategy normally (it's a function, not a component)
import { getChipStrategy } from '@/lib/chip-strategy';

interface DashboardClientProps {
  players: Player[];
  allPlayers: Player[];
  teams: Team[];
  fixtures: any[];
  events: Event[];
  playerTeams: number[];
  playerHistories: { [key: number]: any };
  squadPlayerIds: Set<number>;
  managerInfo: any;
  managerTeam: any;
  teamId?: number;
}

// Loading fallback component
function TabLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function DashboardClient({
  players,
  allPlayers,
  teams,
  fixtures,
  events,
  playerTeams,
  playerHistories,
  squadPlayerIds,
  managerInfo,
  managerTeam,
  teamId
}: DashboardClientProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  // CRITICAL: Track which tabs have been visited to lazy load content
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['overview']));
  const [activeTab, setActiveTab] = useState('overview');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setVisitedTabs(prev => new Set([...prev, value]));
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
  };

  const closePlayerDetail = () => {
    setSelectedPlayer(null);
  };

  // Calculate current gameweek
  const currentGameweek = events.find(e => e.is_current)?.id || 38;

  // Calculate next 5 gameweeks for Strategy
  const nextGameweeks = events.filter(
    e => e.id > currentGameweek && e.id <= currentGameweek + 5
  );

  // Chip Strategy Data - Only calculate when chips tab is visited
  const chipSets = visitedTabs.has('chips') 
    ? getChipStrategy(currentGameweek, [], fixtures, allPlayers, teams)
    : null;

  const selectedTeam = selectedPlayer ? (teams.find(t => t.id === selectedPlayer.team) || null) : null;

  return (
    <PlayerDetailProvider>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scout">Scout</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="lineup">Best Lineup</TabsTrigger>
          <TabsTrigger value="chips">Chips</TabsTrigger>
        </TabsList>

        {/* --- OVERVIEW TAB --- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1">
            <PlayerPerformance
              players={players}
              allPlayers={allPlayers}
              teams={teams}
              squadPlayerIds={squadPlayerIds}
              onPlayerClick={handlePlayerClick}
              playerHistories={playerHistories}
            />
          </div>
        </TabsContent>

        {/* --- SCOUT TAB --- */}
        <TabsContent value="scout" className="space-y-4">
          {visitedTabs.has('scout') ? (
            <Suspense fallback={<TabLoading />}>
              <Tabs defaultValue="underperformers" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="underperformers">Underperformers (Buy)</TabsTrigger>
                    <TabsTrigger value="overperformers">Overperformers (Sell)</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="underperformers">
                  <UnderperformersList
                    allPlayers={allPlayers}
                    teams={teams}
                    fixtures={fixtures}
                    onPlayerClick={handlePlayerClick}
                    playerHistories={playerHistories}
                  />
                </TabsContent>

                <TabsContent value="overperformers">
                  <OverperformersList
                    allPlayers={allPlayers}
                    teams={teams}
                    fixtures={fixtures}
                    onPlayerClick={handlePlayerClick}
                    playerHistories={playerHistories}
                  />
                </TabsContent>
              </Tabs>

              <div className="grid gap-4 md:grid-cols-2">
                <PlayerVsTeam
                  players={players}
                  teams={teams}
                  playerHistories={playerHistories}
                />
                <PlayerVolatility
                  players={players}
                  allPlayers={allPlayers}
                  teams={teams}
                  playerHistories={playerHistories}
                  squadPlayerIds={squadPlayerIds}
                  onPlayerClick={handlePlayerClick}
                />
              </div>
            </Suspense>
          ) : null}
        </TabsContent>

        {/* --- REPORTS TAB --- */}
        <TabsContent value="reports" className="space-y-4">
          {/* Removed Content as requested */}
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No reports available.</p>
          </div>
        </TabsContent>

        {/* --- TRANSFERS TAB (Merged Strategy) --- */}
        <TabsContent value="transfers" className="space-y-4">
          {visitedTabs.has('transfers') ? (
            <Suspense fallback={<TabLoading />}>
              <TransferStrategyClient
                teams={teams}
                squadPlayers={players}
                allPlayers={allPlayers}
                fixtures={fixtures}
                currentGameweek={currentGameweek}
                nextGameweeks={nextGameweeks}
                playerHistories={playerHistories}
                managerTeam={managerTeam}
                managerInfo={managerInfo}
              />
            </Suspense>
          ) : null}
        </TabsContent>

        {/* --- BEST LINEUP TAB --- */}
        <TabsContent value="lineup" className="space-y-8">
          {visitedTabs.has('lineup') ? (
            <Suspense fallback={<TabLoading />}>
              <div>
                <h3 className="text-lg font-semibold mb-4">Next Gameweek Optimizer</h3>
                <BestLineup
                  squadPlayers={players}
                  allPlayers={allPlayers}
                  fixtures={fixtures}
                  teams={teams}
                />
              </div>

              <div className="pt-8 border-t">
                <h3 className="text-lg font-semibold mb-4">Wildcard / Free Hit Planner</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Planning a chip? Use this tool to build a completely new squad from scratch.
                </p>
                <OptimizationTools
                  allPlayers={allPlayers}
                  fixtures={fixtures}
                  teams={teams}
                  currentBudget={1000}
                />
              </div>
            </Suspense>
          ) : null}
        </TabsContent>

        {/* --- CHIPS TAB --- */}
        <TabsContent value="chips" className="space-y-4">
          {visitedTabs.has('chips') && chipSets ? (
            <Suspense fallback={<TabLoading />}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Chip Strategy (2025/26)</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Strategic recommendations for your chips based on the new two-set rule.
                  </p>
                  <ChipStrategy chipSets={chipSets} currentGameweek={currentGameweek} />
                </div>
                <div>
                  {/* Placeholder for Chip Optimizer */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Chip Optimizer</CardTitle>
                      <CardDescription>Advanced simulation for chip usage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Coming soon: Detailed Monte Carlo simulations to determine the exact expected points gain for each chip in upcoming gameweeks.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </Suspense>
          ) : null}
        </TabsContent>
      </Tabs >

      {/* Player Detail Modal */}
      < PlayerDetailModal
        player={selectedPlayer}
        team={selectedTeam}
        playerHistory={selectedPlayer ? playerHistories[selectedPlayer.id] : null}
        isOpen={!!selectedPlayer}
        onClose={closePlayerDetail}
        fixtures={fixtures}
        teams={teams}
      />
      <Suspense fallback={null}>
        <StrategyPlayerModal
          teams={teams}
          playerHistories={playerHistories}
          fixtures={fixtures}
        />
      </Suspense>
    </PlayerDetailProvider>
  );
}
