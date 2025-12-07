'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team, Fixture, fetchManagerHistory, calculateFreeTransfers } from '@/lib/fpl-api';
import { Separator } from '@/components/ui/separator';
import { getTransferOutCandidates, getTransferInCandidates, getTopStrategicMoves, StrategicMove } from '@/lib/transfer-recommendation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PlayerStatusBadges } from '@/components/player-status-badges';
import { Input } from '@/components/ui/input';
import { Trophy, ArrowRight, TrendingUp } from 'lucide-react';

interface TransferSuggestionsProps {
  currentPlayers: Player[];
  allPlayers: Player[];
  teams: Team[];
  fixtures: Fixture[];
  squadPlayerIds: Set<number>;
  onPlayerClick?: (player: Player) => void;
  bank?: number;
  playerHistories?: { [key: number]: any };
  teamId?: number;
}

export function TransferSuggestions({ currentPlayers, allPlayers, teams, fixtures, squadPlayerIds, onPlayerClick, bank = 0, playerHistories, teamId }: TransferSuggestionsProps) {
  const [avoidRotationRisk, setAvoidRotationRisk] = useState(false);
  const [freeTransfers, setFreeTransfers] = useState<number>(5); // Default to 5 as per user request
  const [recommendations, setRecommendations] = useState<StrategicMove[]>([]);

  // Fetch Free Transfers (but respect manual override if changed)
  // Logic: Load estimated, but if user specifically asked for 5 initially, maybe we just leave it editable.
  // The user said: "manually set that for now". So we default to 5, and let history update it ONLY if we want.
  // Actually, better to fetch real estimate, but allow override. 
  // User specific request: "from this gameweek all teams have 5 free transfers... manually set that for now".
  // So initial state 5 is correct.
  useEffect(() => {
    if (teamId) {
      fetchManagerHistory(teamId).then(history => {
        const ft = calculateFreeTransfers(history);
        // setFreeTransfers(ft); // DISABLE AUTO-UPDATE per user request to keep manual control / default 5
        console.log("Calculated FT:", ft);
      }).catch(err => console.error("Failed to fetch history for FT", err));
    }
  }, [teamId]);

  const [weights, setWeights] = useState<any>(undefined);

  useEffect(() => {
    // Load ML weights to customize strategy
    import('@/lib/ml-learning-engine').then(({ LearningEngine }) => {
      LearningEngine.getCurrentWeights().then(w => setWeights(w));
    });
  }, []);

  // Calculate Unified Recommendations
  useEffect(() => {
    if (currentPlayers.length > 0 && allPlayers.length > 0) {
      const recs = getTopStrategicMoves(currentPlayers, allPlayers, fixtures, bank, freeTransfers, 10, weights);
      setRecommendations(recs);
    }
  }, [currentPlayers, allPlayers, fixtures, bank, freeTransfers, weights]);

  const getTeamName = (id: number) => teams.find(t => t.id === id)?.short_name;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Transfer Strategy
            </CardTitle>
            <CardDescription>
              Ranked moves based on Net Score (Points Gain - Hit Costs).
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 border p-2 rounded bg-muted/30">
              <Label htmlFor="ft-override" className="text-xs font-semibold whitespace-nowrap">Free Transfers:</Label>
              <Input
                id="ft-override"
                type="number"
                value={freeTransfers}
                onChange={(e) => setFreeTransfers(parseInt(e.target.value) || 0)}
                className="w-16 h-8 text-center"
                min={0}
                max={5}
              />
            </div>
            <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded border">
              <Switch
                id="rotation-risk"
                checked={avoidRotationRisk}
                onCheckedChange={setAvoidRotationRisk}
              />
              <Label htmlFor="rotation-risk" className="text-xs cursor-pointer">
                Safe Picks Only
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {recommendations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>No high-value moves found given current constraints.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <Card key={idx} className={`overflow-hidden border-l-4 ${idx === 0 ? 'border-l-yellow-500 ring-1 ring-yellow-500/50' : 'border-l-blue-500'}`}>
                <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">

                  {/* Type & Score */}
                  <div className="md:col-span-1 flex flex-col items-center justify-center text-center space-y-1">
                    <Badge variant={rec.type === 'double' ? 'secondary' : 'default'} className="mb-1">
                      {rec.type === 'double' ? 'Double Move' : 'Single Move'}
                    </Badge>
                    <div className="text-2xl font-bold text-green-600">+{rec.netScore.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">Net Score</div>
                    {rec.transferCost > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1">- {rec.transferCost} Hit Cost</Badge>}
                  </div>

                  {/* Move Details */}
                  <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
                    {/* OUT */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-red-500 uppercase tracking-widest border-b pb-1 mb-1">Out</div>
                      {rec.playersOut.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{p.web_name}</span>
                            <span className="text-xs text-muted-foreground">({getTeamName(p.team)})</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono">£{(p.now_cost / 10).toFixed(1)}m</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* IN */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-green-600 uppercase tracking-widest border-b pb-1 mb-1">In</div>
                      {rec.playersIn.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded shadow-sm border border-green-100 dark:border-green-900/30">
                          <div className="flex items-center gap-2 cursor-pointer hover:underline" onClick={() => onPlayerClick?.(p)}>
                            <span className="text-sm font-bold">{p.web_name}</span>
                            <span className="text-xs text-muted-foreground">({getTeamName(p.team)})</span>
                            <PlayerStatusBadges player={p} playerHistory={playerHistories?.[p.id]} />
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono">£{(p.now_cost / 10).toFixed(1)}m</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Footer Status */}
                <div className="bg-muted/40 px-4 py-2 text-xs flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {rec.netBudget > 0
                      ? <span className="text-green-600 font-medium">Saves £{(rec.netBudget / 10).toFixed(1)}m</span>
                      : <span className="text-orange-600 font-medium">Costs £{(Math.abs(rec.netBudget) / 10).toFixed(1)}m</span>
                    }
                  </span>
                  <span>Raw Gain: {rec.scoreGain.toFixed(0)} pts</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
