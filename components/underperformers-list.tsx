
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Player, Team, Fixture } from '@/lib/fpl-api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlayerStatusBadges } from '@/components/player-status-badges';

interface UnderperformersListProps {
    allPlayers: Player[];
    teams: Team[];
    fixtures: Fixture[];
    onPlayerClick?: (player: Player) => void;
    playerHistories?: { [key: number]: any };
}

export function UnderperformersList({ allPlayers, teams, fixtures, onPlayerClick, playerHistories }: UnderperformersListProps) {
    const [showGoodFixturesOnly, setShowGoodFixturesOnly] = useState(false);

    // Helper to get team name
    const getTeamName = (teamId: number) => {
        return teams.find(t => t.id === teamId)?.short_name || 'Unknown';
    };

    // Helper to get upcoming fixtures and difficulty
    const getUpcomingFixturesInfo = (player: Player) => {
        const upcoming = fixtures
            .filter(f => (f.team_h === player.team || f.team_a === player.team) && !f.finished)
            .sort((a, b) => a.event - b.event)
            .slice(0, 5);

        const avgDifficulty = upcoming.reduce((sum, f) => {
            const isHome = f.team_h === player.team;
            return sum + (isHome ? f.team_h_difficulty : f.team_a_difficulty);
        }, 0) / (upcoming.length || 1);

        return { upcoming, avgDifficulty };
    };

    // PERFORMANCE FIX: Memoize expensive calculation to prevent recalculation on every render
    const underperformers = useMemo(() => {
        return allPlayers
            .filter(p => {
                // Filter for players with significant minutes to avoid noise
                if (p.minutes < 300) return false;

                // Must have xGI data
                if (!p.expected_goal_involvements) return false;

                return true;
            })
            .map(p => {
                const xGI = parseFloat(p.expected_goal_involvements || '0');
                const actualGI = p.goals_scored + p.assists;
                const delta = xGI - actualGI;
                const { upcoming, avgDifficulty } = getUpcomingFixturesInfo(p);

                return {
                    player: p,
                    xGI,
                    actualGI,
                    delta,
                    upcoming,
                    avgDifficulty
                };
            })
            .filter(item => {
                // Must be underperforming (positive delta)
                // Let's set a threshold to show only "unlucky" players
                if (item.delta < 1.0) return false;

                // Filter by fixtures if toggle is on
                if (showGoodFixturesOnly && item.avgDifficulty > 3.0) return false;

                return true;
            })
            .sort((a, b) => b.delta - a.delta) // Sort by most underperforming
            .slice(0, 20); // Top 20
    }, [allPlayers, fixtures, showGoodFixturesOnly]);

    const getDifficultyColor = (difficulty: number) => {
        if (difficulty <= 2) return 'bg-green-500';
        if (difficulty === 3) return 'bg-gray-400';
        if (difficulty === 4) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>📉 Underperformers Watchlist</CardTitle>
                        <CardDescription>
                            Players with high Expected Goal Involvement (xGI) but low actual returns.
                            Statistically likely to improve ("regress to the mean").
                        </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-lg">
                        <Switch
                            id="fixtures-filter"
                            checked={showGoodFixturesOnly}
                            onCheckedChange={setShowGoodFixturesOnly}
                        />
                        <Label htmlFor="fixtures-filter" className="cursor-pointer">
                            Good Fixtures Only
                        </Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-right">xGI</TableHead>
                            <TableHead className="text-right">Actual G+A</TableHead>
                            <TableHead className="text-right">Delta</TableHead>
                            <TableHead>Next 3 Fixtures</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {underperformers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No underperformers found matching criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            underperformers.map(({ player, xGI, actualGI, delta, upcoming }) => (
                                <TableRow key={player.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            <div>
                                                <button
                                                    onClick={() => onPlayerClick?.(player)}
                                                    className="hover:text-primary hover:underline cursor-pointer text-left"
                                                >
                                                    {player.web_name}
                                                </button>
                                                <div className="text-xs text-muted-foreground">
                                                    {player.element_type === 1 ? 'GKP' : player.element_type === 2 ? 'DEF' : player.element_type === 3 ? 'MID' : 'FWD'}
                                                </div>
                                            </div>
                                            <PlayerStatusBadges
                                                player={player}
                                                playerHistory={playerHistories?.[player.id]}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>{getTeamName(player.team)}</TableCell>
                                    <TableCell className="text-right font-mono">{xGI.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono">{actualGI}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300">
                                            +{delta.toFixed(2)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {upcoming.slice(0, 3).map((f, i) => {
                                                const isHome = f.team_h === player.team;
                                                const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
                                                const opponentId = isHome ? f.team_a : f.team_h;
                                                const opponent = teams.find(t => t.id === opponentId)?.short_name || 'UNK';

                                                return (
                                                    <TooltipProvider key={i}>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <div className={`w-8 h-6 flex items-center justify-center text-[10px] font-bold text-white rounded ${getDifficultyColor(difficulty)}`}>
                                                                    {opponent}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{isHome ? 'Home' : 'Away'} vs {opponent}</p>
                                                                <p>Difficulty: {difficulty}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">£{(player.now_cost / 10).toFixed(1)}m</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
