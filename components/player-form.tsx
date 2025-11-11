'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team } from '@/lib/fpl-api';

interface PlayerFormProps {
  players: Player[];
  allPlayers: Player[];
  teams: Team[];
  squadPlayerIds: Set<number>;
  onPlayerClick?: (player: Player) => void;
}

export function PlayerForm({ players, allPlayers, teams, squadPlayerIds, onPlayerClick }: PlayerFormProps) {
  // Sort squad players by form (descending)
  const sortedPlayers = [...players].sort((a, b) => parseFloat(b.form) - parseFloat(a.form));

  // Get top 20 players in the game by form (min 300 minutes played)
  const topGamePlayers = [...allPlayers]
    .filter(p => p.minutes >= 300) // Must have played significant minutes
    .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
    .slice(0, 20);

  const getFormBadgeColor = (form: number) => {
    if (form >= 6) return 'bg-green-500 hover:bg-green-600';
    if (form >= 4) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  const isInSquad = (playerId: number) => squadPlayerIds.has(playerId);

  const getRowClassName = (playerId: number) => {
    return isInSquad(playerId) ? '' : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30';
  };

  const renderPlayerTable = (playerList: Player[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Form</TableHead>
          <TableHead className="text-right">PPG</TableHead>
          <TableHead className="text-right">Total Points</TableHead>
          <TableHead className="text-right">Minutes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {playerList.map(player => {
          const team = teams.find(t => t.id === player.team);
          const form = parseFloat(player.form);
          const ppg = parseFloat(player.points_per_game);

          return (
            <TableRow key={player.id} className={getRowClassName(player.id)}>
              <TableCell className="font-medium">
                <button
                  onClick={() => onPlayerClick?.(player)}
                  className="hover:text-primary hover:underline cursor-pointer text-left"
                >
                  {player.web_name}
                  {!isInSquad(player.id) && (
                    <span className="ml-2 text-xs text-red-600 dark:text-red-400">⭐</span>
                  )}
                </button>
              </TableCell>
              <TableCell>{team?.short_name}</TableCell>
              <TableCell className="text-right">
                <Badge className={`${getFormBadgeColor(form)} text-white`}>
                  {form.toFixed(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{ppg.toFixed(1)}</TableCell>
              <TableCell className="text-right">{player.total_points}</TableCell>
              <TableCell className="text-right">{player.minutes}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>📈 Player Form</CardTitle>
        <CardDescription>Recent performance (last 5 games average)</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="squad" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="squad">Your Squad</TabsTrigger>
            <TabsTrigger value="top">Top in Game</TabsTrigger>
          </TabsList>

          <TabsContent value="squad" className="mt-4">
            {renderPlayerTable(sortedPlayers)}
          </TabsContent>

          <TabsContent value="top" className="mt-4">
            <div className="mb-3 text-sm text-muted-foreground">
              Top 20 players by form (minimum 300 minutes played). ⭐ = Not in your squad.
            </div>
            {renderPlayerTable(topGamePlayers)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
