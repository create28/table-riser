'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team } from '@/lib/fpl-api';

interface ValueEfficiencyProps {
  players: Player[];
  allPlayers: Player[];
  teams: Team[];
  squadPlayerIds: Set<number>;
  onPlayerClick?: (player: Player) => void;
}

export function ValueEfficiency({ players, allPlayers, teams, squadPlayerIds, onPlayerClick }: ValueEfficiencyProps) {
  // Calculate value efficiency (points per million) for squad
  const playersWithValue = players.map(player => ({
    ...player,
    pointsPerMillion: player.total_points > 0 ? (player.total_points / (player.now_cost / 10)) : 0,
    cost: player.now_cost / 10,
  }));

  // Sort squad by points per million (descending)
  const sortedPlayers = [...playersWithValue].sort((a, b) => b.pointsPerMillion - a.pointsPerMillion);

  // Get top 20 players in the game by value (min 300 minutes played)
  const topGamePlayers = [...allPlayers]
    .filter(p => p.minutes >= 300 && p.total_points > 0) // Must have played significant minutes
    .map(player => ({
      ...player,
      pointsPerMillion: player.total_points / (player.now_cost / 10),
      cost: player.now_cost / 10,
    }))
    .sort((a, b) => b.pointsPerMillion - a.pointsPerMillion)
    .slice(0, 20);

  const getValueBadgeColor = (ppm: number) => {
    if (ppm >= 25) return 'bg-green-500 hover:bg-green-600';
    if (ppm >= 18) return 'bg-lime-500 hover:bg-lime-600';
    if (ppm >= 12) return 'bg-yellow-500 hover:bg-yellow-600';
    if (ppm >= 8) return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  const isInSquad = (playerId: number) => squadPlayerIds.has(playerId);

  const getRowClassName = (playerId: number) => {
    return isInSquad(playerId) ? '' : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30';
  };

  const renderPlayerTable = (playerList: any[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Total Points</TableHead>
          <TableHead className="text-right">Points/£M</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {playerList.map(player => {
          const team = teams.find(t => t.id === player.team);

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
              <TableCell className="text-right">£{player.cost.toFixed(1)}m</TableCell>
              <TableCell className="text-right">{player.total_points}</TableCell>
              <TableCell className="text-right">
                <Badge className={`${getValueBadgeColor(player.pointsPerMillion)} text-white`}>
                  {player.pointsPerMillion.toFixed(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {player.pointsPerMillion >= 25 ? '⭐ Excellent' : 
                 player.pointsPerMillion >= 18 ? '💎 Very Good' :
                 player.pointsPerMillion >= 12 ? '✅ Good' :
                 player.pointsPerMillion >= 8 ? '➖ Average' :
                 '⚠️ Poor'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>💰 Value Efficiency</CardTitle>
        <CardDescription>
          Points per million spent on each player
          <span className="block text-xs mt-1 opacity-75">
            ⭐ Excellent (25+) | 💎 Very Good (18-24) | ✅ Good (12-17) | ➖ Average (8-11) | ⚠️ Poor (&lt;8)
          </span>
        </CardDescription>
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
              Top 20 most valuable players (minimum 300 minutes played). ⭐ = Not in your squad.
            </div>
            {renderPlayerTable(topGamePlayers)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
