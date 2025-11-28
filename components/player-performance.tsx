'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player, Team } from '@/lib/fpl-api';
import { PlayerStatusBadges } from '@/components/player-status-badges';

interface PlayerPerformanceProps {
    players: Player[];
    allPlayers: Player[];
    teams: Team[];
    squadPlayerIds: Set<number>;
    onPlayerClick?: (player: Player) => void;
    playerHistories?: { [key: number]: any };
}

export function PlayerPerformance({
    players,
    allPlayers,
    teams,
    squadPlayerIds,
    onPlayerClick,
    playerHistories
}: PlayerPerformanceProps) {

    // --- Form Logic ---
    const sortedByForm = [...players].sort((a, b) => parseFloat(b.form) - parseFloat(a.form));
    const topFormPlayers = [...allPlayers]
        .filter(p => !squadPlayerIds.has(p.id) && p.minutes > 300) // Filter out squad players and low minutes
        .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
        .slice(0, 5);

    const getFormColor = (form: string) => {
        const formVal = parseFloat(form);
        if (formVal >= 6.0) return 'text-green-600 font-bold';
        if (formVal >= 4.0) return 'text-blue-600 font-semibold';
        if (formVal <= 2.0) return 'text-red-500';
        return '';
    };

    // --- Value Logic ---
    const calculateValue = (player: Player) => {
        if (player.now_cost === 0) return 0;
        return player.total_points / (player.now_cost / 10);
    };

    const sortedByValue = [...players].sort((a, b) => calculateValue(b) - calculateValue(a));
    const topValuePlayers = [...allPlayers]
        .filter(p => !squadPlayerIds.has(p.id) && p.minutes > 300)
        .sort((a, b) => calculateValue(b) - calculateValue(a))
        .slice(0, 5);

    const getValueColor = (value: number) => {
        if (value >= 25) return 'bg-green-500';
        if (value >= 20) return 'bg-blue-500';
        if (value >= 15) return 'bg-yellow-500';
        return 'bg-gray-500';
    };

    const getTeamName = (teamId: number) => {
        return teams.find(t => t.id === teamId)?.short_name || 'UNK';
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Player Performance</CardTitle>
                <CardDescription>Form and Value Efficiency analysis</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="form" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="form">Recent Form</TabsTrigger>
                        <TabsTrigger value="value">Value (Pts/£m)</TabsTrigger>
                    </TabsList>

                    {/* --- FORM TAB --- */}
                    <TabsContent value="form" className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Your Squad</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Player</TableHead>
                                        <TableHead className="text-right">Form</TableHead>
                                        <TableHead className="text-right">Pts</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedByForm.slice(0, 5).map((player) => (
                                        <TableRow key={player.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center">
                                                    <button
                                                        onClick={() => onPlayerClick?.(player)}
                                                        className="hover:text-primary hover:underline text-left"
                                                    >
                                                        {player.web_name}
                                                    </button>
                                                    <PlayerStatusBadges player={player} playerHistory={playerHistories?.[player.id]} />
                                                </div>
                                                <div className="text-xs text-muted-foreground">{getTeamName(player.team)}</div>
                                            </TableCell>
                                            <TableCell className={`text-right ${getFormColor(player.form)}`}>
                                                {player.form}
                                            </TableCell>
                                            <TableCell className="text-right">{player.total_points}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium mb-2 text-muted-foreground">League Leaders (Watchlist)</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Player</TableHead>
                                        <TableHead className="text-right">Form</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topFormPlayers.map((player) => (
                                        <TableRow key={player.id} className="bg-muted/30">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center">
                                                    <button
                                                        onClick={() => onPlayerClick?.(player)}
                                                        className="hover:text-primary hover:underline text-left"
                                                    >
                                                        {player.web_name}
                                                    </button>
                                                    <PlayerStatusBadges player={player} playerHistory={playerHistories?.[player.id]} />
                                                </div>
                                                <div className="text-xs text-muted-foreground">{getTeamName(player.team)}</div>
                                            </TableCell>
                                            <TableCell className={`text-right ${getFormColor(player.form)}`}>
                                                {player.form}
                                            </TableCell>
                                            <TableCell className="text-right">£{(player.now_cost / 10).toFixed(1)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* --- VALUE TAB --- */}
                    <TabsContent value="value" className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Your Squad</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Player</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead className="text-right">Pts</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedByValue.slice(0, 5).map((player) => {
                                        const value = calculateValue(player);
                                        return (
                                            <TableRow key={player.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center">
                                                        <button
                                                            onClick={() => onPlayerClick?.(player)}
                                                            className="hover:text-primary hover:underline text-left"
                                                        >
                                                            {player.web_name}
                                                        </button>
                                                        <PlayerStatusBadges player={player} playerHistory={playerHistories?.[player.id]} />
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{getTeamName(player.team)}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className={`${getValueColor(value)} text-white`}>
                                                        {value.toFixed(1)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{player.total_points}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Best Value Gems</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Player</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topValuePlayers.map((player) => {
                                        const value = calculateValue(player);
                                        return (
                                            <TableRow key={player.id} className="bg-muted/30">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center">
                                                        <button
                                                            onClick={() => onPlayerClick?.(player)}
                                                            className="hover:text-primary hover:underline text-left"
                                                        >
                                                            {player.web_name}
                                                        </button>
                                                        <PlayerStatusBadges player={player} playerHistory={playerHistories?.[player.id]} />
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{getTeamName(player.team)}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className={`${getValueColor(value)} text-white`}>
                                                        {value.toFixed(1)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">£{(player.now_cost / 10).toFixed(1)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
