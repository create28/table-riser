'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team } from '@/lib/fpl-api';
import { Progress } from '@/components/ui/progress';

interface PlayerVolatilityProps {
  players: Player[];
  allPlayers: Player[];
  teams: Team[];
  playerHistories: { [playerId: number]: PlayerHistory };
  squadPlayerIds: Set<number>;
  onPlayerClick?: (player: Player) => void;
}

interface PlayerHistory {
  history: Array<{
    element: number;
    total_points: number;
    round: number;
  }>;
}

interface VolatilityMetrics {
  player: Player;
  avgPoints: number;
  stdDev: number;
  coefficientOfVariation: number;
  volatilityScore: number;
  highScores: number; // Games with 8+ points
  blanks: number; // Games with 0-2 points
  consistency: number; // Games within 1 std dev of mean
  maxPoints: number;
  minPoints: number;
  gamesPlayed: number;
}

export function PlayerVolatility({ players, allPlayers, teams, playerHistories, squadPlayerIds, onPlayerClick }: PlayerVolatilityProps) {
  const calculateVolatility = (player: Player): VolatilityMetrics => {
    const history = playerHistories[player.id]?.history || [];
    
    if (history.length === 0) {
      return {
        player,
        avgPoints: 0,
        stdDev: 0,
        coefficientOfVariation: 0,
        volatilityScore: 0,
        highScores: 0,
        blanks: 0,
        consistency: 0,
        maxPoints: 0,
        minPoints: 0,
        gamesPlayed: 0,
      };
    }

    const points = history.map(h => h.total_points);
    const n = points.length;
    
    // Calculate mean
    const avgPoints = points.reduce((sum, p) => sum + p, 0) / n;
    
    // Calculate standard deviation
    const variance = points.reduce((sum, p) => sum + Math.pow(p - avgPoints, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation (CV) - normalized volatility
    const coefficientOfVariation = avgPoints > 0 ? (stdDev / avgPoints) * 100 : 0;
    
    // Volatility score (0-100, higher = more volatile)
    // Based on CV, with some normalization
    const volatilityScore = Math.min(100, coefficientOfVariation);
    
    // Count high scores (8+ points)
    const highScores = points.filter(p => p >= 8).length;
    
    // Count blanks (0-2 points)
    const blanks = points.filter(p => p <= 2).length;
    
    // Count consistent performances (within 1 std dev of mean)
    const consistency = points.filter(p => 
      Math.abs(p - avgPoints) <= stdDev
    ).length;
    
    const maxPoints = Math.max(...points);
    const minPoints = Math.min(...points);

    return {
      player,
      avgPoints,
      stdDev,
      coefficientOfVariation,
      volatilityScore,
      highScores,
      blanks,
      consistency,
      maxPoints,
      minPoints,
      gamesPlayed: n,
    };
  };

  // Calculate metrics for all players who have history data
  const playersWithMetrics = allPlayers
    .filter(p => playerHistories[p.id]) // Only players with history
    .map(calculateVolatility)
    .filter(m => m.gamesPlayed >= 3); // Only show players with 3+ games

  // Sort by volatility (most volatile first)
  const volatilePlayers = [...playersWithMetrics]
    .sort((a, b) => b.volatilityScore - a.volatilityScore)
    .slice(0, 10);

  // Sort by stability (most stable first)
  const stablePlayers = [...playersWithMetrics]
    .sort((a, b) => a.volatilityScore - b.volatilityScore)
    .slice(0, 10);

  // Sort by high haul potential (most big scores)
  const haulPlayers = [...playersWithMetrics]
    .sort((a, b) => {
      // Prioritize players with high scores and good average
      const scoreA = (b.highScores / b.gamesPlayed) * b.avgPoints;
      const scoreB = (a.highScores / a.gamesPlayed) * a.avgPoints;
      return scoreA - scoreB;
    })
    .slice(0, 10);

  const getVolatilityBadge = (score: number) => {
    if (score >= 70) return { color: 'bg-red-500 hover:bg-red-600', label: 'Very Volatile' };
    if (score >= 50) return { color: 'bg-orange-500 hover:bg-orange-600', label: 'Volatile' };
    if (score >= 30) return { color: 'bg-yellow-500 hover:bg-yellow-600', label: 'Moderate' };
    if (score >= 15) return { color: 'bg-blue-500 hover:bg-blue-600', label: 'Stable' };
    return { color: 'bg-green-500 hover:bg-green-600', label: 'Very Stable' };
  };

  const getTeamName = (teamId: number) => {
    return teams.find(t => t.id === teamId)?.short_name || 'Unknown';
  };

  const isInSquad = (playerId: number) => {
    return squadPlayerIds.has(playerId);
  };

  const getRowClassName = (playerId: number) => {
    return isInSquad(playerId) ? '' : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30';
  };

  const getPlayerType = (metrics: VolatilityMetrics) => {
    const { volatilityScore, avgPoints, highScores, gamesPlayed } = metrics;
    const haulRate = (highScores / gamesPlayed) * 100;

    if (volatilityScore >= 60 && haulRate >= 40) return '🚀 Differential';
    if (volatilityScore >= 50 && avgPoints >= 5) return '💎 Explosive';
    if (volatilityScore < 30 && avgPoints >= 5) return '⭐ Premium Stable';
    if (volatilityScore < 30) return '🛡️ Reliable';
    if (avgPoints >= 6) return '🔥 Hot Streak';
    return '📊 Moderate';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Points Volatility Analysis</CardTitle>
        <CardDescription>
          Identify explosive differential picks vs consistent reliable players
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="volatile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="volatile">High Volatility 🎢</TabsTrigger>
            <TabsTrigger value="stable">High Stability 🛡️</TabsTrigger>
            <TabsTrigger value="hauls">Big Haul Potential 🚀</TabsTrigger>
          </TabsList>

          {/* Volatile Players */}
          <TabsContent value="volatile" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <p className="text-sm">
                <strong>Volatile Players:</strong> Boom or bust - great for differentials and captain punts. 
                High ceiling but inconsistent. Perfect when chasing in your mini-league!
              </p>
              <p className="text-xs mt-2 text-muted-foreground">
                💡 <span className="bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded">Light red background</span> = Player not in your squad (potential transfer target)
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">±</TableHead>
                  <TableHead className="text-right">High/Blank</TableHead>
                  <TableHead className="text-right">Range</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Volatility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volatilePlayers.map(metrics => {
                  const badge = getVolatilityBadge(metrics.volatilityScore);
                  return (
                    <TableRow key={metrics.player.id} className={getRowClassName(metrics.player.id)}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => onPlayerClick?.(metrics.player)}
                          className="hover:text-primary hover:underline cursor-pointer text-left"
                        >
                          {metrics.player.web_name}
                          {!isInSquad(metrics.player.id) && (
                            <span className="ml-2 text-xs text-red-600 dark:text-red-400">⭐</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>{getTeamName(metrics.player.team)}</TableCell>
                      <TableCell className="text-right">{metrics.avgPoints.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ±{metrics.stdDev.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-semibold">{metrics.highScores}</span>
                        {' / '}
                        <span className="text-red-600">{metrics.blanks}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {metrics.minPoints}-{metrics.maxPoints}
                      </TableCell>
                      <TableCell className="text-xs">{getPlayerType(metrics)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={`${badge.color} text-white`}>
                          {metrics.volatilityScore.toFixed(0)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Stable Players */}
          <TabsContent value="stable" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <p className="text-sm">
                <strong>Stable Players:</strong> Consistent scorers you can rely on week-in, week-out. 
                Lower ceiling but safe picks. Great for building a solid foundation!
              </p>
              <p className="text-xs mt-2 text-muted-foreground">
                💡 <span className="bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded">Light red background</span> = Player not in your squad (potential transfer target)
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">±</TableHead>
                  <TableHead className="text-right">Consistent</TableHead>
                  <TableHead className="text-right">Range</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Stability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stablePlayers.map(metrics => {
                  const badge = getVolatilityBadge(metrics.volatilityScore);
                  const consistencyRate = (metrics.consistency / metrics.gamesPlayed) * 100;
                  return (
                    <TableRow key={metrics.player.id} className={getRowClassName(metrics.player.id)}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => onPlayerClick?.(metrics.player)}
                          className="hover:text-primary hover:underline cursor-pointer text-left"
                        >
                          {metrics.player.web_name}
                          {!isInSquad(metrics.player.id) && (
                            <span className="ml-2 text-xs text-red-600 dark:text-red-400">⭐</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>{getTeamName(metrics.player.team)}</TableCell>
                      <TableCell className="text-right">{metrics.avgPoints.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ±{metrics.stdDev.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {metrics.consistency}/{metrics.gamesPlayed}
                        <div className="text-xs text-muted-foreground">
                          {consistencyRate.toFixed(0)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {metrics.minPoints}-{metrics.maxPoints}
                      </TableCell>
                      <TableCell className="text-xs">{getPlayerType(metrics)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={`${badge.color} text-white`}>
                          {(100 - metrics.volatilityScore).toFixed(0)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Haul Potential */}
          <TabsContent value="hauls" className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <p className="text-sm">
                <strong>High Haul Potential:</strong> Players most likely to deliver explosive gameweeks. 
                Best captain options when in form with favorable fixtures!
              </p>
              <p className="text-xs mt-2 text-muted-foreground">
                💡 <span className="bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded">Light red background</span> = Player not in your squad (potential transfer target)
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead className="text-right">Hauls (8+)</TableHead>
                  <TableHead className="text-right">Haul Rate</TableHead>
                  <TableHead>Ceiling</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {haulPlayers.map(metrics => {
                  const haulRate = (metrics.highScores / metrics.gamesPlayed) * 100;
                  const haulScore = (metrics.highScores / metrics.gamesPlayed) * metrics.avgPoints;
                  
                  return (
                    <TableRow key={metrics.player.id} className={getRowClassName(metrics.player.id)}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => onPlayerClick?.(metrics.player)}
                          className="hover:text-primary hover:underline cursor-pointer text-left"
                        >
                          {metrics.player.web_name}
                          {!isInSquad(metrics.player.id) && (
                            <span className="ml-2 text-xs text-red-600 dark:text-red-400">⭐</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>{getTeamName(metrics.player.team)}</TableCell>
                      <TableCell className="text-right">{metrics.avgPoints.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-bold text-purple-600">
                        {metrics.maxPoints}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-600">{metrics.highScores}</span>
                        <span className="text-muted-foreground">/{metrics.gamesPlayed}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">{haulRate.toFixed(0)}%</div>
                          <Progress value={haulRate} className="h-1" />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {metrics.maxPoints >= 15 ? '🚀 Elite' : 
                         metrics.maxPoints >= 12 ? '💎 High' : 
                         metrics.maxPoints >= 10 ? '✨ Good' : '📊 Moderate'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-purple-500 hover:bg-purple-600 text-white">
                          {haulScore.toFixed(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t space-y-2 text-xs text-muted-foreground">
          <p><strong>Volatility Score:</strong> Higher = more unpredictable. Based on coefficient of variation.</p>
          <p><strong>± (Std Dev):</strong> Average deviation from mean. Lower = more consistent.</p>
          <p><strong>High/Blank:</strong> Games with 8+ points / Games with 0-2 points</p>
          <p><strong>Consistent:</strong> Games where points were within 1 standard deviation of average</p>
          <p><strong>Haul Rate:</strong> Percentage of games with 8+ points</p>
          <p className="pt-2 border-t">
            <strong>Strategy Tips:</strong>
            <br />• High volatility players: Great for differential captain picks when chasing
            <br />• Stable players: Safe picks for consistent returns, good team foundation
            <br />• High haul potential: Best captain options with favorable fixtures
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

