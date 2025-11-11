'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Player, Team } from '@/lib/fpl-api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface PlayerDetailModalProps {
  player: Player | null;
  team: Team | null;
  playerHistory: any;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerDetailModal({ player, team, playerHistory, isOpen, onClose }: PlayerDetailModalProps) {
  if (!player) return null;

  const history = playerHistory?.history || [];
  
  // Construct player image URL using the player code
  // Premier League resources host player images at this pattern
  const playerImageUrl = `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.code}.png`;
  const fallbackImageUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;
  
  // Prepare data for charts
  const gameweekData = history.map((match: any) => ({
    gameweek: `GW${match.round}`,
    points: match.total_points,
    minutes: match.minutes,
    goals: match.goals_scored,
    assists: match.assists,
    bonus: match.bonus,
    cleanSheet: match.clean_sheets,
  }));

  // Last 5 games data
  const last5Games = gameweekData.slice(-5);
  
  // Calculate stats
  const totalGames = history.length;
  const avgPoints = totalGames > 0 ? history.reduce((sum: number, m: any) => sum + m.total_points, 0) / totalGames : 0;
  const last5Avg = last5Games.length > 0 ? last5Games.reduce((sum: number, m: any) => sum + m.points, 0) / last5Games.length : 0;
  const highestScore = totalGames > 0 ? Math.max(...history.map((m: any) => m.total_points)) : 0;
  const blanks = history.filter((m: any) => m.total_points <= 2).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {/* Player Image */}
            <div className="flex-shrink-0">
              <img
                src={playerImageUrl}
                alt={player.web_name}
                className="w-24 h-24 rounded-lg object-cover bg-muted border-2 border-border"
                onError={(e) => {
                  // Fallback to smaller image if 250x250 fails
                  const target = e.target as HTMLImageElement;
                  if (target.src === playerImageUrl) {
                    target.src = fallbackImageUrl;
                  } else {
                    // If both fail, hide the image
                    target.style.display = 'none';
                  }
                }}
              />
            </div>
            
            {/* Player Info */}
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-3 mb-2">
                {player.web_name}
                <Badge variant="outline" className="text-sm">
                  {team?.short_name || 'Team'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-base">
                <div className="space-y-1">
                  <div>£{(player.now_cost / 10).toFixed(1)}m | {player.element_type === 1 ? 'Goalkeeper' : player.element_type === 2 ? 'Defender' : player.element_type === 3 ? 'Midfielder' : 'Forward'}</div>
                  <div className="text-xs">{player.first_name} {player.second_name}</div>
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Points</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-500">{player.total_points}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Form</p>
            <p className="text-xl font-bold text-orange-700 dark:text-orange-500">{player.form}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">PPG</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-500">{player.points_per_game}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Selected By</p>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-500">{player.selected_by_percent}%</p>
          </div>
        </div>

        {/* External Resources */}
        <div className="flex flex-wrap gap-2 text-sm">
          <a
            href={`https://understat.com/player/${player.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300 transition-colors"
          >
            📊 View xG on Understat
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <a
            href={`https://fbref.com/en/search/search.fcgi?search=${encodeURIComponent(player.first_name + ' ' + player.second_name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 transition-colors"
          >
            📈 Advanced Stats on FBref
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <Separator />

        {/* Last 5 Games Form */}
        {last5Games.length > 0 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Last 5 Games Form</h3>
              <p className="text-sm text-muted-foreground">
                Average: {last5Avg.toFixed(1)} pts/game
              </p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last5Games}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="gameweek" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--popover)', 
                    border: '1px solid var(--border)',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="points" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <Separator />

        {/* Full Season Points Chart */}
        {gameweekData.length > 0 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Season Points Per Gameweek</h3>
              <p className="text-sm text-muted-foreground">
                {totalGames} games | {avgPoints.toFixed(1)} avg | {highestScore} highest | {blanks} blanks
              </p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={gameweekData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="gameweek" 
                  style={{ fontSize: '10px' }}
                  interval={gameweekData.length > 15 ? 1 : 0}
                />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--popover)', 
                    border: '1px solid var(--border)',
                    borderRadius: '6px'
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover p-3 border rounded-lg shadow-lg">
                          <p className="font-semibold mb-2">{data.gameweek}</p>
                          <div className="space-y-1 text-xs">
                            <p><strong>Points:</strong> {data.points}</p>
                            <p><strong>Minutes:</strong> {data.minutes}</p>
                            {data.goals > 0 && <p><strong>Goals:</strong> {data.goals}</p>}
                            {data.assists > 0 && <p><strong>Assists:</strong> {data.assists}</p>}
                            {data.bonus > 0 && <p><strong>Bonus:</strong> {data.bonus}</p>}
                            {data.cleanSheet > 0 && <p><strong>Clean Sheet:</strong> ✓</p>}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="points" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Attacking Stats */}
        <Separator />
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">⚽ Attacking Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Goals</p>
              <p className="font-semibold text-lg">{player.goals_scored}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Assists</p>
              <p className="font-semibold text-lg">{player.assists}</p>
            </div>
            {player.expected_goals && parseFloat(player.expected_goals) > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">xG (Expected Goals)</p>
                <p className="font-semibold text-lg text-purple-600">{parseFloat(player.expected_goals).toFixed(2)}</p>
              </div>
            )}
            {player.expected_assists && parseFloat(player.expected_assists) > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">xA (Expected Assists)</p>
                <p className="font-semibold text-lg text-purple-600">{parseFloat(player.expected_assists).toFixed(2)}</p>
              </div>
            )}
            {player.expected_goal_involvements && parseFloat(player.expected_goal_involvements) > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">xGI (Involvements)</p>
                <p className="font-semibold text-lg text-purple-600">{parseFloat(player.expected_goal_involvements).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs">Bonus Points</p>
              <p className="font-semibold text-lg">{player.bonus}</p>
            </div>
          </div>
        </div>

        {/* Defensive Stats */}
        <Separator />
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">🛡️ Defensive Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Clean Sheets</p>
              <p className="font-semibold text-lg">{player.clean_sheets}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Goals Conceded</p>
              <p className="font-semibold text-lg">{player.goals_conceded}</p>
            </div>
            {player.expected_goals_conceded && parseFloat(player.expected_goals_conceded) > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">xGC (Expected Conceded)</p>
                <p className="font-semibold text-lg text-purple-600">{parseFloat(player.expected_goals_conceded).toFixed(2)}</p>
              </div>
            )}
            {player.saves !== undefined && player.saves > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">Saves</p>
                <p className="font-semibold text-lg text-blue-600">{player.saves}</p>
              </div>
            )}
            {player.penalties_saved !== undefined && player.penalties_saved > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">Penalties Saved</p>
                <p className="font-semibold text-lg text-green-600">{player.penalties_saved}</p>
              </div>
            )}
            {player.own_goals !== undefined && player.own_goals > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">Own Goals</p>
                <p className="font-semibold text-lg text-red-600">{player.own_goals}</p>
              </div>
            )}
          </div>
        </div>

        {/* Disciplinary & Other */}
        <Separator />
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">📊 Other Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Minutes Played</p>
              <p className="font-semibold text-lg">{player.minutes}</p>
            </div>
            {player.yellow_cards !== undefined && (
              <div>
                <p className="text-muted-foreground text-xs">Yellow Cards</p>
                <p className="font-semibold text-lg text-yellow-600">{player.yellow_cards}</p>
              </div>
            )}
            {player.red_cards !== undefined && player.red_cards > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">Red Cards</p>
                <p className="font-semibold text-lg text-red-600">{player.red_cards}</p>
              </div>
            )}
            {player.penalties_missed !== undefined && player.penalties_missed > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">Penalties Missed</p>
                <p className="font-semibold text-lg text-orange-600">{player.penalties_missed}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs">ICT Index</p>
              <p className="font-semibold text-lg">{parseFloat(player.ict_index).toFixed(1)}</p>
            </div>
            {player.bps !== undefined && (
              <div>
                <p className="text-muted-foreground text-xs">BPS (Bonus System)</p>
                <p className="font-semibold text-lg">{player.bps}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs">Transfers In (GW)</p>
              <p className="font-semibold text-lg text-green-600">{player.transfers_in_event.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Transfers Out (GW)</p>
              <p className="font-semibold text-lg text-red-600">{player.transfers_out_event.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {gameweekData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No gameweek data available for this player yet</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

