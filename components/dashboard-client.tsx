'use client';

import { useState } from 'react';
import { Player, Team } from '@/lib/fpl-api';
import { PlayerDetailModal } from '@/components/player-detail-modal';
import { PlayerForm } from '@/components/player-form';
import { ValueEfficiency } from '@/components/value-efficiency';
import { TeamForm } from '@/components/team-form';
import { FixtureDifficulty } from '@/components/fixture-difficulty';
import { TransferCoefficient } from '@/components/transfer-coefficient';
import { TransferSuggestions } from '@/components/transfer-suggestions';
import { PlayerVsTeam } from '@/components/player-vs-team';
import { PlayerVolatility } from '@/components/player-volatility';
import { OptimizationTools } from '@/components/optimization-tools';
import { UnderperformersList } from '@/components/underperformers-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerPerformance } from '@/components/player-performance';
import { ChipStrategy } from '@/components/chip-strategy';
import { getChipStrategy } from '@/lib/chip-strategy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardClientProps {
  players: Player[];
  allPlayers: Player[];
  teams: Team[];
  fixtures: any[];
  playerTeams: number[];
  playerHistories: { [key: number]: any };
  squadPlayerIds: Set<number>;
}

export function DashboardClient({
  players,
  allPlayers,
  teams,
  fixtures,
  playerTeams,
  playerHistories,
  squadPlayerIds,
}: DashboardClientProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
  };

  const closePlayerDetail = () => {
    setSelectedPlayer(null);
  };

  // Calculate current gameweek (approximate based on fixtures)
  const currentGameweek = fixtures.find(f => !f.finished)?.event || 38;

  // Chip Strategy Data (Mock data for now as we don't have user chip history)
  const chipSets = getChipStrategy(currentGameweek, [], fixtures);

  const selectedTeam = selectedPlayer ? (teams.find(t => t.id === selectedPlayer.team) || null) : null;

  return (
    <>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scout">Scout</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="lineup">Best Lineup</TabsTrigger>
          <TabsTrigger value="chips">Chips</TabsTrigger>
        </TabsList>

        {/* --- OVERVIEW TAB --- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <PlayerPerformance
                players={players}
                allPlayers={allPlayers}
                teams={teams}
                squadPlayerIds={squadPlayerIds}
                onPlayerClick={handlePlayerClick}
                playerHistories={playerHistories}
              />
            </div>
            <div className="col-span-3">
              <FixtureDifficulty teams={teams} fixtures={fixtures} playerTeams={playerTeams} />
            </div>
          </div>
          {/* Team Stats could go here if we had a dedicated component */}
        </TabsContent>

        {/* --- SCOUT TAB --- */}
        <TabsContent value="scout" className="space-y-4">
          <UnderperformersList
            allPlayers={allPlayers}
            teams={teams}
            fixtures={fixtures}
            onPlayerClick={handlePlayerClick}
            playerHistories={playerHistories}
          />
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

        {/* --- TRANSFERS TAB --- */}
        <TabsContent value="transfers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <TransferCoefficient players={players} onPlayerClick={handlePlayerClick} />
            </div>
            <div className="md:col-span-2">
              <TransferSuggestions
                currentPlayers={players}
                allPlayers={allPlayers}
                teams={teams}
                fixtures={fixtures}
                squadPlayerIds={squadPlayerIds}
                onPlayerClick={handlePlayerClick}
                playerHistories={playerHistories}
              />
            </div>
          </div>
        </TabsContent>

        {/* --- BEST LINEUP TAB --- */}
        <TabsContent value="lineup" className="space-y-4">
          <div className="flex flex-col items-center justify-center py-12 space-y-4 border rounded-lg bg-muted/10">
            <h3 className="text-2xl font-bold">Best Lineup Optimizer</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Use our advanced optimization tool to pick your best starting XI, captain, and vice-captain for the upcoming gameweek.
            </p>
            <a
              href="/lineup"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to Best Lineup Tool
            </a>
          </div>

          <OptimizationTools
            allPlayers={allPlayers}
            fixtures={fixtures}
            teams={teams}
            currentBudget={1000}
          />
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
              {/* Placeholder for Chip Optimizer or more detailed analysis */}
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
      </Tabs>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={selectedPlayer}
        team={selectedTeam}
        playerHistory={selectedPlayer ? playerHistories[selectedPlayer.id] : null}
        isOpen={!!selectedPlayer}
        onClose={closePlayerDetail}
      />
    </>
  );
}

