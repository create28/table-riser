'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Player } from '@/lib/fpl-api';

interface PlayerDetailContextType {
  selectedPlayer: Player | null;
  selectPlayer: (player: Player) => void;
  closePlayerDetail: () => void;
}

const PlayerDetailContext = createContext<PlayerDetailContextType | undefined>(undefined);

export function PlayerDetailProvider({ children }: { children: ReactNode }) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const selectPlayer = (player: Player) => {
    setSelectedPlayer(player);
  };

  const closePlayerDetail = () => {
    setSelectedPlayer(null);
  };

  return (
    <PlayerDetailContext.Provider value={{ selectedPlayer, selectPlayer, closePlayerDetail }}>
      {children}
    </PlayerDetailContext.Provider>
  );
}

export function usePlayerDetail() {
  const context = useContext(PlayerDetailContext);
  if (context === undefined) {
    throw new Error('usePlayerDetail must be used within a PlayerDetailProvider');
  }
  return context;
}



