'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team } from '@/lib/fpl-api';
import { 
  loadHistoricalData, 
  findHistoricalMatches, 
  aggregatePlayerVsTeam,
  type HistoricalSeasonData,
  type PlayerVsTeamHistorical 
} from '@/lib/historical-data';

interface PlayerVsTeamProps {
  players: Player[];
  teams: Team[];
  playerHistories: { [playerId: number]: PlayerHistory };
}

interface PlayerHistory {
  history: Array<{
    element: number;
    fixture: number;
    opponent_team: number;
    total_points: number;
    was_home: boolean;
    kickoff_time: string;
    team_h_score: number;
    team_a_score: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    minutes: number;
    bonus: number;
  }>;
}

interface TeamPerformance {
  team: Team;
  matches: number;
  totalPoints: number;
  avgPoints: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  highestScore: number;
  homeMatches: number;
  awayMatches: number;
}

export function PlayerVsTeam({ players, teams, playerHistories }: PlayerVsTeamProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(players[0] || null);
  const [historicalData, setHistoricalData] = useState<HistoricalSeasonData[]>([]);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(true);

  // Load historical data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingHistorical(true);
        const data = await loadHistoricalData();
        setHistoricalData(data);
        console.log('Historical data loaded successfully');
      } catch (error) {
        console.error('Failed to load historical data:', error);
      } finally {
        setIsLoadingHistorical(false);
      }
    };
    loadData();
  }, []);

  const analyzePlayerVsTeams = (playerId: number): TeamPerformance[] => {
    const history = playerHistories[playerId]?.history || [];
    
    // Group matches by opponent
    const teamStats: { [teamId: number]: TeamPerformance } = {};

    history.forEach(match => {
      const opponentId = match.opponent_team;
      
      if (!teamStats[opponentId]) {
        const team = teams.find(t => t.id === opponentId);
        if (!team) return;
        
        teamStats[opponentId] = {
          team,
          matches: 0,
          totalPoints: 0,
          avgPoints: 0,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          highestScore: 0,
          homeMatches: 0,
          awayMatches: 0,
        };
      }

      const stat = teamStats[opponentId];
      stat.matches++;
      stat.totalPoints += match.total_points;
      stat.goals += match.goals_scored;
      stat.assists += match.assists;
      stat.cleanSheets += match.clean_sheets;
      stat.highestScore = Math.max(stat.highestScore, match.total_points);
      
      if (match.was_home) {
        stat.homeMatches++;
      } else {
        stat.awayMatches++;
      }
    });

    // Calculate averages
    Object.values(teamStats).forEach(stat => {
      stat.avgPoints = stat.matches > 0 ? stat.totalPoints / stat.matches : 0;
    });

    // Sort by average points (descending)
    return Object.values(teamStats).sort((a, b) => b.avgPoints - a.avgPoints);
  };

  const getPerformanceBadgeColor = (avgPoints: number) => {
    if (avgPoints >= 8) return 'bg-green-500 hover:bg-green-600';
    if (avgPoints >= 6) return 'bg-lime-500 hover:bg-lime-600';
    if (avgPoints >= 4) return 'bg-yellow-500 hover:bg-yellow-600';
    if (avgPoints >= 2) return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  const getPerformanceLabel = (avgPoints: number) => {
    if (avgPoints >= 8) return 'Elite';
    if (avgPoints >= 6) return 'Excellent';
    if (avgPoints >= 4) return 'Good';
    if (avgPoints >= 2) return 'Average';
    return 'Poor';
  };

  const teamPerformances = selectedPlayer ? analyzePlayerVsTeams(selectedPlayer.id) : [];

  // Analyze historical data
  const analyzeHistoricalData = (): Map<number, PlayerVsTeamHistorical> | null => {
    if (!selectedPlayer || historicalData.length === 0) return null;

    const playerFullName = `${selectedPlayer.first_name} ${selectedPlayer.second_name}`;
    const historicalMatches = findHistoricalMatches(playerFullName, historicalData);

    if (historicalMatches.length === 0) return null;

    return aggregatePlayerVsTeam(historicalMatches);
  };

  const historicalPerformances = analyzeHistoricalData();

  // Get overall stats - current season
  const totalMatches = teamPerformances.reduce((sum, t) => sum + t.matches, 0);
  const totalPoints = teamPerformances.reduce((sum, t) => sum + t.totalPoints, 0);
  const bestOpponent = teamPerformances[0];
  const worstOpponent = teamPerformances[teamPerformances.length - 1];

  // Get overall stats - historical
  const historicalTotalMatches = historicalPerformances 
    ? Array.from(historicalPerformances.values()).reduce((sum, t) => sum + t.matches, 0)
    : 0;
  const historicalTotalPoints = historicalPerformances
    ? Array.from(historicalPerformances.values()).reduce((sum, t) => sum + t.totalPoints, 0)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚔️ Player vs Team Analysis</CardTitle>
        <CardDescription>
          Performance against specific opponents (current season + 3 historical seasons)
          <span className="block text-xs mt-1 opacity-75">
            📊 Data from 2021/22, 2022/23, 2023/24, and 2024/25 seasons
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Player Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">Select Player</label>
          <select
            className="w-full p-2 border rounded-md bg-background"
            value={selectedPlayer?.id || ''}
            onChange={(e) => {
              const player = players.find(p => p.id === parseInt(e.target.value));
              setSelectedPlayer(player || null);
            }}
          >
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.web_name} ({teams.find(t => t.id === player.team)?.short_name})
              </option>
            ))}
          </select>
        </div>

        {selectedPlayer && (
          <>
            {isLoadingHistorical && (
              <div className="text-center py-4 text-muted-foreground">
                <p>Loading historical data...</p>
              </div>
            )}

            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">Current Season (24/25)</TabsTrigger>
                <TabsTrigger value="historical">
                  Historical (21/22 - 23/24)
                  {historicalTotalMatches > 0 && (
                    <span className="ml-2 text-xs">({historicalTotalMatches} matches)</span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* CURRENT SEASON TAB */}
              <TabsContent value="current" className="mt-4 space-y-4">
                {totalMatches > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Matches</p>
                    <p className="text-2xl font-bold">{totalMatches}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Points</p>
                    <p className="text-2xl font-bold text-blue-600">{totalPoints}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Best vs</p>
                    <p className="text-lg font-bold text-green-600">{bestOpponent?.team.short_name}</p>
                    <p className="text-xs text-muted-foreground">{bestOpponent?.avgPoints.toFixed(1)} avg</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Worst vs</p>
                    <p className="text-lg font-bold text-red-600">{worstOpponent?.team.short_name}</p>
                    <p className="text-xs text-muted-foreground">{worstOpponent?.avgPoints.toFixed(1)} avg</p>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Opponent</TableHead>
                        <TableHead className="text-right">Matches</TableHead>
                        <TableHead className="text-right">Avg Pts</TableHead>
                        <TableHead className="text-right">Total Pts</TableHead>
                        <TableHead className="text-right">Goals</TableHead>
                        <TableHead className="text-right">Assists</TableHead>
                        <TableHead className="text-right">CS</TableHead>
                        <TableHead className="text-right">Best</TableHead>
                        <TableHead className="text-center">H/A</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamPerformances.map(perf => (
                        <TableRow key={perf.team.id}>
                          <TableCell className="font-medium">{perf.team.name}</TableCell>
                          <TableCell className="text-right">{perf.matches}</TableCell>
                          <TableCell className="text-right font-bold">
                            {perf.avgPoints.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right">{perf.totalPoints}</TableCell>
                          <TableCell className="text-right">{perf.goals}</TableCell>
                          <TableCell className="text-right">{perf.assists}</TableCell>
                          <TableCell className="text-right">{perf.cleanSheets}</TableCell>
                          <TableCell className="text-right">{perf.highestScore}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {perf.homeMatches}H / {perf.awayMatches}A
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className={`${getPerformanceBadgeColor(perf.avgPoints)} text-white`}>
                              {getPerformanceLabel(perf.avgPoints)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="text-xs text-muted-foreground mt-4">
                  <p>📊 <strong>Data Source:</strong> FPL API - Current season (2024/25) only</p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg font-semibold">No data available</p>
                <p className="mt-2">This player hasn&apos;t played enough matches this season</p>
              </div>
            )}
              </TabsContent>

              {/* HISTORICAL TAB */}
              <TabsContent value="historical" className="mt-4 space-y-4">
                {historicalPerformances && historicalTotalMatches > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Matches</p>
                        <p className="text-2xl font-bold">{historicalTotalMatches}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Points</p>
                        <p className="text-2xl font-bold text-purple-600">{historicalTotalPoints}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Avg Per Game</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {(historicalTotalPoints / historicalTotalMatches).toFixed(1)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Seasons</p>
                        <p className="text-lg font-bold text-blue-600">21/22 - 23/24</p>
                      </div>
                    </div>

                    {/* Historical Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Opponent</TableHead>
                            <TableHead className="text-right">Matches</TableHead>
                            <TableHead className="text-right">Avg Pts</TableHead>
                            <TableHead className="text-right">Total Pts</TableHead>
                            <TableHead className="text-right">Goals</TableHead>
                            <TableHead className="text-right">Assists</TableHead>
                            <TableHead className="text-right">CS</TableHead>
                            <TableHead className="text-center">H/A</TableHead>
                            <TableHead className="text-center">Seasons</TableHead>
                            <TableHead className="text-right">Rating</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from(historicalPerformances.entries())
                            .sort((a, b) => b[1].avgPoints - a[1].avgPoints)
                            .map(([teamId, perf]) => {
                              const team = teams.find(t => t.id === teamId);
                              if (!team) return null;

                              return (
                                <TableRow key={teamId}>
                                  <TableCell className="font-medium">{team.name}</TableCell>
                                  <TableCell className="text-right">{perf.matches}</TableCell>
                                  <TableCell className="text-right font-bold">
                                    {perf.avgPoints.toFixed(1)}
                                  </TableCell>
                                  <TableCell className="text-right">{perf.totalPoints}</TableCell>
                                  <TableCell className="text-right">{perf.goals}</TableCell>
                                  <TableCell className="text-right">{perf.assists}</TableCell>
                                  <TableCell className="text-right">{perf.cleanSheets}</TableCell>
                                  <TableCell className="text-center text-xs text-muted-foreground">
                                    {perf.homeMatches}H / {perf.awayMatches}A
                                  </TableCell>
                                  <TableCell className="text-center text-xs text-muted-foreground">
                                    {perf.seasons.join(', ')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge className={`${getPerformanceBadgeColor(perf.avgPoints)} text-white`}>
                                      {getPerformanceLabel(perf.avgPoints)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="text-xs text-muted-foreground mt-4 space-y-1">
                      <p>💡 <strong>Pro Tip:</strong> Historical data helps identify consistent performers against specific teams</p>
                      <p>📊 <strong>Data Source:</strong> vaastav/Fantasy-Premier-League GitHub repository</p>
                      <p>⚠️ <strong>Note:</strong> Player matching by name (may not match if player changed teams between leagues)</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-lg font-semibold">No historical data available</p>
                    <p className="mt-2">
                      {isLoadingHistorical 
                        ? 'Loading historical data...' 
                        : 'This player may not have been in the Premier League during 2021-2024'}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}

