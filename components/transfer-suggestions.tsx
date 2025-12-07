'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team, Fixture, fetchManagerHistory, calculateFreeTransfers } from '@/lib/fpl-api';
import { Separator } from '@/components/ui/separator';
import { getTransferOutCandidates, getTransferInCandidates, TransferCandidate, getDoubleTransferRecommendations, DoubleTransferRecommendation } from '@/lib/transfer-recommendation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PlayerStatusBadges } from '@/components/player-status-badges';

interface TransferSuggestionsProps {
  currentPlayers: Player[];
  allPlayers: Player[];
  teams: Team[];
  fixtures: Fixture[];
  squadPlayerIds: Set<number>;
  onPlayerClick?: (player: Player) => void;
  bank?: number;
  playerHistories?: { [key: number]: any };
  teamId?: number; // Add teamId prop to fetch history
}

export function TransferSuggestions({ currentPlayers, allPlayers, teams, fixtures, squadPlayerIds, onPlayerClick, bank = 0, playerHistories, teamId }: TransferSuggestionsProps) {
  const [avoidRotationRisk, setAvoidRotationRisk] = useState(false);
  const [freeTransfers, setFreeTransfers] = useState<number | null>(null);
  const [doubleTransferRecs, setDoubleTransferRecs] = useState<DoubleTransferRecommendation[]>([]);

  // Fetch Free Transfers
  useEffect(() => {
    if (teamId) {
      fetchManagerHistory(teamId).then(history => {
        const ft = calculateFreeTransfers(history);
        setFreeTransfers(ft);
      }).catch(err => console.error("Failed to fetch history for FT", err));
    }
  }, [teamId]);

  // Calculate Double Transfer Recs
  useEffect(() => {
    // Only run if we have players
    if (currentPlayers.length > 0 && allPlayers.length > 0) {
      const recs = getDoubleTransferRecommendations(currentPlayers, allPlayers, fixtures, bank);
      setDoubleTransferRecs(recs);
    }
  }, [currentPlayers, allPlayers, fixtures, bank]); // Dependencies


  // Get candidates using unified logic
  const transferOutCandidates = getTransferOutCandidates(currentPlayers, fixtures)
    .filter(c => c.score > 0)
    .slice(0, 5);

  // Get players not in current squad
  const currentPlayerIds = currentPlayers.map(p => p.id);
  const availablePlayers = allPlayers.filter(p => !currentPlayerIds.includes(p.id));

  // Calculate scores for transfer in by position
  const getPositionName = (elementType: number) => {
    switch (elementType) {
      case 1: return 'GKP';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return 'Unknown';
    }
  };

  // We assume a generic budget for suggestions if we don't know who is being sold
  // Or we could just show top players. Let's use a high budget to show best options generally,
  // but ideally this would be dynamic. For now, let's assume we can afford most players (100m budget cap effectively)
  // In a real app, we might want to select a player to sell first.
  const transferInByPosition: { [key: number]: TransferCandidate[] } = {};
  [1, 2, 3, 4].forEach(position => {
    transferInByPosition[position] = getTransferInCandidates(
      availablePlayers,
      fixtures,
      position,
      2000, // 2000 = 200.0m, effectively unlimited
      playerHistories,
      avoidRotationRisk
    ).slice(0, 5);
  });

  const getScoreBadgeColor = (score: number) => {
    if (score >= 50) return 'bg-red-500 hover:bg-red-600';
    if (score >= 30) return 'bg-orange-500 hover:bg-orange-600';
    if (score >= 15) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  const getInScoreBadgeColor = (score: number) => {
    if (score >= 40) return 'bg-green-600 hover:bg-green-700';
    if (score >= 30) return 'bg-green-500 hover:bg-green-600';
    return 'bg-blue-500 hover:bg-blue-600';
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Transfer Suggestions</CardTitle>
            <CardDescription>
              AI-powered recommendations based on Form, Fixtures, Value, xG/xA, and Trends.
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-lg">
            <Switch
              id="rotation-risk"
              checked={avoidRotationRisk}
              onCheckedChange={setAvoidRotationRisk}
            />
            <Label htmlFor="rotation-risk" className="cursor-pointer">
              Avoid Rotation Risk
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="out" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="out">Transfer Out</TabsTrigger>
            <TabsTrigger value="in">Transfer In</TabsTrigger>
            <TabsTrigger value="double">Double Move ✨</TabsTrigger>
          </TabsList>

          <TabsContent value="out" className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg mb-4 flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                💡 Light red background indicates underperforming players
              </p>
              {freeTransfers !== null && (
                <Badge variant={freeTransfers > 1 ? "default" : "secondary"} className={freeTransfers === 0 ? "bg-red-100 text-red-800 hover:bg-red-100" : ""}>
                  {freeTransfers} Free Transfer{freeTransfers !== 1 && 's'}
                </Badge>
              )}
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
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferOutCandidates.map(({ player, reasons, score, breakdown }) => (
                    <TableRow key={player.id} className={getRowClassName(player.id)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <button
                            onClick={() => onPlayerClick?.(player)}
                            className="hover:text-primary hover:underline cursor-pointer text-left"
                          >
                            {player.web_name}
                          </button>
                          <PlayerStatusBadges
                            player={player}
                            playerHistory={playerHistories?.[player.id]}
                          />
                        </div>
                      </TableCell>
                      <TableCell>{getTeamName(player.team)}</TableCell>
                      <TableCell className="text-right">{player.form}</TableCell>
                      <TableCell className="text-right">{(player.total_points / (player.now_cost / 10)).toFixed(1)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {reasons.map((r, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground">• {r}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge className={`${getScoreBadgeColor(score)} text-white cursor-help`}>
                                {score}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="font-semibold border-b pb-1 mb-1">Score Breakdown</p>
                                <div className="grid grid-cols-2 gap-x-4">
                                  <span>Form:</span> <span>{breakdown.form}</span>
                                  <span>Fixtures:</span> <span>{breakdown.fixtures}</span>
                                  <span>Value:</span> <span>{breakdown.value}</span>
                                  <span>Trends:</span> <span>{breakdown.trends}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        <TableHead className="text-right">xGI</TableHead>
                        <TableHead>Strengths</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map(({ player, reasons, score, breakdown }) => (
                        <TableRow key={player.id} className={getRowClassName(player.id)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <button
                                onClick={() => onPlayerClick?.(player)}
                                className="hover:text-primary hover:underline cursor-pointer text-left"
                              >
                                {player.web_name}
                              </button>
                              <PlayerStatusBadges
                                player={player}
                                playerHistory={playerHistories?.[player.id]}
                              />
                            </div>
                          </TableCell>
                          <TableCell>{getTeamName(player.team)}</TableCell>
                          <TableCell className="text-right">£{(player.now_cost / 10).toFixed(1)}m</TableCell>
                          <TableCell className="text-right">{player.form}</TableCell>
                          <TableCell className="text-right">{player.expected_goal_involvements ? parseFloat(player.expected_goal_involvements).toFixed(2) : '-'}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {reasons.slice(0, 3).map((r, idx) => (
                                <div key={idx} className="text-xs text-muted-foreground">• {r}</div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge className={`${getInScoreBadgeColor(score)} text-white cursor-help`}>
                                    {score}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <p className="font-semibold border-b pb-1 mb-1">Score Breakdown</p>
                                    <div className="grid grid-cols-2 gap-x-4">
                                      <span>Form:</span> <span>{breakdown.form}</span>
                                      <span>Fixtures:</span> <span>{breakdown.fixtures}</span>
                                      <span>Value:</span> <span>{breakdown.value}</span>
                                      <span>xG/xA:</span> <span>{breakdown.xg}</span>
                                      <span>Trends:</span> <span>{breakdown.trends}</span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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

          <TabsContent value="double" className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg mb-4">
              <p className="text-xs text-muted-foreground">
                ✨ <strong>Optimization:</strong> Suggestions to upgrade your team even without a massive budget.
                These pairs involve selling an underperforming player + an expensive player to fund a massive upgrade.
              </p>
            </div>
            {doubleTransferRecs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No high-value double transfers found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {doubleTransferRecs.map((rec, i) => (
                  <Card key={i} className="overflow-hidden border-l-4 border-l-purple-500">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      {/* OUT */}
                      <div className="space-y-2 bg-red-50 dark:bg-red-950/10 p-3 rounded">
                        <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Sell</div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{rec.out1.web_name}</span>
                          <span className="text-xs text-muted-foreground">£{(rec.out1.now_cost / 10).toFixed(1)}m</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{rec.out2.web_name}</span>
                          <span className="text-xs text-muted-foreground">£{(rec.out2.now_cost / 10).toFixed(1)}m</span>
                        </div>
                      </div>

                      {/* IN */}
                      <div className="space-y-2 bg-green-50 dark:bg-green-950/10 p-3 rounded">
                        <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Buy</div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{rec.in1.web_name}</span>
                          <span className="text-xs text-muted-foreground">£{(rec.in1.now_cost / 10).toFixed(1)}m</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{rec.in2.web_name}</span>
                          <span className="text-xs text-muted-foreground">£{(rec.in2.now_cost / 10).toFixed(1)}m</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/30 p-2 text-xs text-center flex justify-between px-4">
                      <span>Net Cost: <span className={rec.netCost <= 0 ? "text-green-600 font-bold" : "text-red-500"}>
                        {rec.netCost <= 0 ? "+" : "-"}{Math.abs(rec.netCost / 10).toFixed(1)}m
                      </span></span>
                      <span>Score Gain: <span className="font-bold text-purple-600">+{rec.scoreGain.toFixed(0)} pts</span></span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

