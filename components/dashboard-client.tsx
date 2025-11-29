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
import { BestLineup } from '@/components/best-lineup';
import { ScoutReports } from '@/components/scout-reports';
import { ScoutReportItem, PlayerMention } from '@/lib/rss';

interface DashboardClientProps {
  players: Player[];
  allPlayers: Player[];
  teams: Team[];
  fixtures: any[];
  playerTeams: number[];
  playerHistories: { [key: number]: any };
  squadPlayerIds: Set<number>;
  reportsTabContent: React.ReactNode;
}

export function DashboardClient({
  players,
  allPlayers,
  teams,
  fixtures,
  playerTeams,
  playerHistories,
  squadPlayerIds,
  reportsTabContent,
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

        {/* --- REPORTS TAB --- */}
        <TabsContent value="reports" className="space-y-4">
          {reportsTabContent}
        </TabsContent>

        {/* ... (Other Tabs) */}
      </Tabs>

      {/* ... (Modal) */}
    </>
  );
}
