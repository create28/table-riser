'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team, Fixture } from '@/lib/fpl-api';
import { Separator } from '@/components/ui/separator';

interface TransferSuggestionsProps {
  currentPlayers: Player[];
  allPlayers: Player[];
  teams: Team[];
  fixtures: Fixture[];
  squadPlayerIds: Set<number>;
  onPlayerClick?: (player: Player) => void;
}

interface TransferCandidate {
  player: Player;
  reason: string[];
  score: number;
  fixtureScore: number;
  formScore: number;
  valueScore: number;
}

export function TransferSuggestions({ currentPlayers, allPlayers, teams, fixtures, squadPlayerIds, onPlayerClick }: TransferSuggestionsProps) {
  // Calculate transfer out candidates (players to remove)
  const calculateTransferOutScore = (player: Player): TransferCandidate => {
    const reasons: string[] = [];
    let score = 0;

    // Poor form
    const form = parseFloat(player.form);
    if (form < 3) {
      reasons.push('Poor form (< 3.0)');
      score += 30;
    } else if (form < 4) {
      reasons.push('Below average form');
      score += 15;
    }

    // Poor value efficiency
    const pointsPerMillion = player.total_points > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    if (pointsPerMillion < 15) {
      reasons.push('Poor value (< 15 pts/£m)');
      score += 25;
    } else if (pointsPerMillion < 20) {
      reasons.push('Below average value');
      score += 10;
    }

    // Low minutes
    if (player.minutes < 300) {
      reasons.push('Low playing time');
      score += 20;
    } else if (player.minutes < 500) {
      reasons.push('Limited minutes');
      score += 10;
    }

    // High transfer out pressure
    const transferOutCoefficient = (player.transfers_out_event / 1000) * (1 + parseFloat(player.selected_by_percent) / 100);
    if (transferOutCoefficient > 10) {
      reasons.push('Mass exodus by managers');
      score += 20;
    }

    // Difficult upcoming fixtures
    const upcomingFixtures = fixtures
      .filter(f => (f.team_h === player.team || f.team_a === player.team) && !f.finished)
      .sort((a, b) => a.event - b.event)
      .slice(0, 5);

    const avgDifficulty = upcomingFixtures.reduce((sum, fixture) => {
      const isHome = fixture.team_h === player.team;
      return sum + (isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty);
    }, 0) / (upcomingFixtures.length || 1);

    if (avgDifficulty >= 4) {
      reasons.push('Very tough fixtures ahead');
      score += 15;
    } else if (avgDifficulty >= 3.5) {
      reasons.push('Difficult fixtures');
      score += 8;
    }

    return {
      player,
      reason: reasons,
      score,
      fixtureScore: avgDifficulty,
      formScore: form,
      valueScore: pointsPerMillion,
    };
  };

  // Calculate transfer in candidates (players to bring in)
  const calculateTransferInScore = (player: Player, position: number): TransferCandidate => {
    const reasons: string[] = [];
    let score = 0;

    // Excellent form
    const form = parseFloat(player.form);
    if (form >= 6) {
      reasons.push('Excellent form (6.0+)');
      score += 30;
    } else if (form >= 5) {
      reasons.push('Great form');
      score += 20;
    } else if (form >= 4) {
      reasons.push('Good form');
      score += 10;
    }

    // Good value efficiency
    const pointsPerMillion = player.total_points > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    if (pointsPerMillion >= 30) {
      reasons.push('Exceptional value (30+ pts/£m)');
      score += 25;
    } else if (pointsPerMillion >= 25) {
      reasons.push('Great value');
      score += 15;
    } else if (pointsPerMillion >= 20) {
      reasons.push('Good value');
      score += 10;
    }

    // High minutes (consistent starter)
    if (player.minutes >= 900) {
      reasons.push('Regular starter');
      score += 15;
    } else if (player.minutes >= 600) {
      reasons.push('Good playing time');
      score += 8;
    }

    // High transfer in pressure (popular pick)
    const transferInCoefficient = (player.transfers_in_event / 1000) * (1 + parseFloat(player.selected_by_percent) / 100);
    if (transferInCoefficient > 15) {
      reasons.push('Extremely popular transfer');
      score += 15;
    } else if (transferInCoefficient > 8) {
      reasons.push('Popular transfer target');
      score += 10;
    }

    // Easy upcoming fixtures
    const upcomingFixtures = fixtures
      .filter(f => (f.team_h === player.team || f.team_a === player.team) && !f.finished)
      .sort((a, b) => a.event - b.event)
      .slice(0, 5);

    const avgDifficulty = upcomingFixtures.reduce((sum, fixture) => {
      const isHome = fixture.team_h === player.team;
      return sum + (isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty);
    }, 0) / (upcomingFixtures.length || 1);

    if (avgDifficulty <= 2.5) {
      reasons.push('Very favorable fixtures');
      score += 20;
    } else if (avgDifficulty <= 3) {
      reasons.push('Good fixture run');
      score += 12;
    }

    // Points per game
    const ppg = parseFloat(player.points_per_game);
    if (ppg >= 6) {
      reasons.push('Elite PPG (6.0+)');
      score += 15;
    } else if (ppg >= 5) {
      reasons.push('Strong PPG');
      score += 10;
    }

    return {
      player,
      reason: reasons,
      score,
      fixtureScore: avgDifficulty,
      formScore: form,
      valueScore: pointsPerMillion,
    };
  };

  // Get players not in current squad
  const currentPlayerIds = currentPlayers.map(p => p.id);
  const availablePlayers = allPlayers.filter(p => !currentPlayerIds.includes(p.id));

  // Calculate scores for transfer out
  const transferOutCandidates = currentPlayers
    .map(calculateTransferOutScore)
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Calculate scores for transfer in by position
  const getPositionName = (elementType: number) => {
    switch(elementType) {
      case 1: return 'GKP';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return 'Unknown';
    }
  };

  const transferInByPosition: { [key: number]: TransferCandidate[] } = {};
  [1, 2, 3, 4].forEach(position => {
    transferInByPosition[position] = availablePlayers
      .filter(p => p.element_type === position && p.minutes >= 300) // Only consider players with decent minutes
      .map(p => calculateTransferInScore(p, position))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  });

  const getScoreBadgeColor = (score: number) => {
    if (score >= 50) return 'bg-red-500 hover:bg-red-600';
    if (score >= 30) return 'bg-orange-500 hover:bg-orange-600';
    if (score >= 15) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-green-500 hover:bg-green-600';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Suggestions</CardTitle>
        <CardDescription>AI-powered recommendations based on form, fixtures, and value</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="out" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="out">Players to Transfer Out</TabsTrigger>
            <TabsTrigger value="in">Players to Transfer In</TabsTrigger>
          </TabsList>

          <TabsContent value="out" className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg mb-4">
              <p className="text-xs text-muted-foreground">
                💡 <span className="bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded">Light red background</span> indicates underperforming players you should consider transferring out
              </p>
            </div>
            {transferOutCandidates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg font-semibold">🎉 Your team looks solid!</p>
                <p className="mt-2">No urgent transfer needs detected</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Form</TableHead>
                    <TableHead className="text-right">Pts/£m</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead className="text-right">Priority</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {transferOutCandidates.map(({ player, reason, score, formScore, valueScore }) => (
                  <TableRow key={player.id} className={getRowClassName(player.id)}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => onPlayerClick?.(player)}
                          className="hover:text-primary hover:underline cursor-pointer text-left"
                        >
                          {player.web_name}
                        </button>
                      </TableCell>
                      <TableCell>{getTeamName(player.team)}</TableCell>
                      <TableCell className="text-right">{formScore.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{valueScore.toFixed(1)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {reason.map((r, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground">• {r}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={`${getScoreBadgeColor(score)} text-white`}>
                          {score >= 50 ? 'Urgent' : score >= 30 ? 'High' : score >= 15 ? 'Medium' : 'Low'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="in" className="space-y-6">
            <div className="bg-muted/50 p-3 rounded-lg mb-4">
              <p className="text-xs text-muted-foreground">
                💡 All players shown are <strong>not in your squad</strong> - these are transfer targets
              </p>
            </div>
            {[1, 2, 3, 4].map(position => {
              const candidates = transferInByPosition[position];
              if (!candidates || candidates.length === 0) return null;

              return (
                <div key={position}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {getPositionName(position)}
                    <Badge variant="outline">{candidates.length} suggestions</Badge>
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Form</TableHead>
                        <TableHead className="text-right">Pts/£m</TableHead>
                        <TableHead>Strengths</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map(({ player, reason, score, formScore, valueScore }) => (
                        <TableRow key={player.id} className={getRowClassName(player.id)}>
                          <TableCell className="font-medium">
                            <button
                              onClick={() => onPlayerClick?.(player)}
                              className="hover:text-primary hover:underline cursor-pointer text-left"
                            >
                              {player.web_name}
                            </button>
                          </TableCell>
                          <TableCell>{getTeamName(player.team)}</TableCell>
                          <TableCell className="text-right">£{(player.now_cost / 10).toFixed(1)}m</TableCell>
                          <TableCell className="text-right">{formScore.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{valueScore.toFixed(1)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {reason.slice(0, 3).map((r, idx) => (
                                <div key={idx} className="text-xs text-muted-foreground">• {r}</div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-green-500 hover:bg-green-600 text-white">
                              {score}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {position !== 4 && <Separator className="mt-6" />}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

