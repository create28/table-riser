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

  const selectedTeam = selectedPlayer ? (teams.find(t => t.id === selectedPlayer.team) || null) : null;

  return (
    <>
      {/* Dashboard Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <PlayerForm
          players={players}
          allPlayers={allPlayers}
          teams={teams}
          squadPlayerIds={squadPlayerIds}
          onPlayerClick={handlePlayerClick}
        />
        <ValueEfficiency
          players={players}
          allPlayers={allPlayers}
          teams={teams}
          squadPlayerIds={squadPlayerIds}
          onPlayerClick={handlePlayerClick}
        />
        <TeamForm teams={teams} fixtures={fixtures} playerTeams={playerTeams} />
        <FixtureDifficulty teams={teams} fixtures={fixtures} playerTeams={playerTeams} />
      </div>

      {/* Full Width Sections */}
      <TransferCoefficient players={players} onPlayerClick={handlePlayerClick} />

      <TransferSuggestions
        currentPlayers={players}
        allPlayers={allPlayers}
        teams={teams}
        fixtures={fixtures}
        squadPlayerIds={squadPlayerIds}
        onPlayerClick={handlePlayerClick}
      />

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

      <OptimizationTools
        allPlayers={allPlayers}
        fixtures={fixtures}
        teams={teams}
        currentBudget={1000}
      />

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

