'use client';

import { useState } from 'react';
import { Player, Team, Event } from '@/lib/fpl-api';
import { PlayerDetailModal } from '@/components/player-detail-modal';
import { PlayerForm } from '@/components/player-form';
import { TransferStrategyClient } from '@/components/transfer-strategy-client';
import { PlayerVsTeam } from '@/components/player-vs-team';
import { PlayerVolatility } from '@/components/player-volatility';
import { OptimizationTools } from '@/components/optimization-tools';
import { OverperformersList } from '@/components/overperformers-list';
import { UnderperformersList } from '@/components/underperformers-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerPerformance } from '@/components/player-performance';
import { ChipStrategy } from '@/components/chip-strategy';
import { getChipStrategy } from '@/lib/chip-strategy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BestLineup } from '@/components/best-lineup';
import { PlayerDetailProvider } from '@/components/player-detail-provider';
import { StrategyPlayerModal } from '@/components/strategy-player-modal';

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

  // Chip Strategy Data with intelligent analysis
  const chipSets = getChipStrategy(currentGameweek, [], fixtures, allPlayers, teams);

  const selectedTeam = selectedPlayer ? (teams.find(t => t.id === selectedPlayer.team) || null) : null;

  return (
    <PlayerDetailProvider>
      <Tabs defaultValue="overview" className="space-y-4">
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
        </TabsContent>

        {/* --- BEST LINEUP TAB --- */}
        <TabsContent value="lineup" className="space-y-8">
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
        </TabsContent>

        {/* --- CHIPS TAB --- */}
        <TabsContent value="chips" className="space-y-4">
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
      <StrategyPlayerModal
        teams={teams}
        playerHistories={playerHistories}
        fixtures={fixtures}
      />
    </PlayerDetailProvider>
  );
}
