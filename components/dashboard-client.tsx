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
  scoutReports: ScoutReportItem[];
  playerMentions: PlayerMention[];
}

export function DashboardClient({
  players,
  allPlayers,
  teams,
  fixtures,
  playerTeams,
  playerHistories,
  squadPlayerIds,
  scoutReports,
  playerMentions,
}: DashboardClientProps) {
  // ... (existing state)

  return (
    <>
      <Tabs defaultValue="overview" className="space-y-4">
        {/* ... (TabsList) */}

        {/* ... (Other Tabs) */}

        {/* --- REPORTS TAB --- */}
        <TabsContent value="reports" className="space-y-4">
          <ScoutReports reports={scoutReports} mentions={playerMentions} />
        </TabsContent>

        {/* ... (Other Tabs) */}
      </Tabs>

      {/* ... (Modal) */}
    </>
  );
}
