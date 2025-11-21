'use client';

import { usePlayerDetail } from '@/components/player-detail-provider';
import { PlayerDetailModal } from '@/components/player-detail-modal';
import { Team } from '@/lib/fpl-api';

interface StrategyPlayerModalProps {
  teams: Team[];
  playerHistories: { [key: number]: any };
}

export function StrategyPlayerModal({ teams, playerHistories }: StrategyPlayerModalProps) {
  const { selectedPlayer, closePlayerDetail } = usePlayerDetail();

  if (!selectedPlayer) return null;

  const selectedTeam = teams.find(t => t.id === selectedPlayer.team) || null;
  const playerHistory = playerHistories[selectedPlayer.id] || null;

  return (
    <PlayerDetailModal
      player={selectedPlayer}
      team={selectedTeam}
      playerHistory={playerHistory}
      isOpen={!!selectedPlayer}
      onClose={closePlayerDetail}
    />
  );
}



