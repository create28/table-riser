'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Player } from '@/lib/fpl-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TransferCoefficientProps {
  players: Player[];
  onPlayerClick?: (player: Player) => void;
}

export function TransferCoefficient({ players, onPlayerClick }: TransferCoefficientProps) {
  // Calculate transfer pressure coefficient
  const playersWithCoefficient = players.map(player => {
    const ownership = parseFloat(player.selected_by_percent);
    const transfersIn = player.transfers_in_event;
    const transfersOut = player.transfers_out_event;
    const netTransfers = transfersIn - transfersOut;
    
    // Transfer pressure coefficient considering ownership
    const transferInCoefficient = (transfersIn / 1000) * (1 + ownership / 100);
    const transferOutCoefficient = (transfersOut / 1000) * (1 + ownership / 100);
    
    return {
      ...player,
      transfersIn,
      transfersOut,
      netTransfers,
      transferInCoefficient,
      transferOutCoefficient,
      ownership,
    };
  });

  const sortedByTransfersIn = [...playersWithCoefficient].sort((a, b) => b.transferInCoefficient - a.transferInCoefficient);
  const sortedByTransfersOut = [...playersWithCoefficient].sort((a, b) => b.transferOutCoefficient - a.transferOutCoefficient);

  const getTransferInBadgeColor = (coefficient: number) => {
    if (coefficient >= 10) return 'bg-green-500 hover:bg-green-600';
    if (coefficient >= 5) return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-gray-500 hover:bg-gray-600';
  };

  const getTransferOutBadgeColor = (coefficient: number) => {
    if (coefficient >= 10) return 'bg-red-500 hover:bg-red-600';
    if (coefficient >= 5) return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-gray-500 hover:bg-gray-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Pressure Analysis</CardTitle>
        <CardDescription>Weighted by ownership percentage</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="in" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in">Transfers In</TabsTrigger>
            <TabsTrigger value="out">Transfers Out</TabsTrigger>
          </TabsList>
          
          <TabsContent value="in">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Ownership %</TableHead>
                  <TableHead className="text-right">Transfers In</TableHead>
                  <TableHead className="text-right">Coefficient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedByTransfersIn.map(player => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => onPlayerClick?.(player)}
                        className="hover:text-primary hover:underline cursor-pointer text-left"
                      >
                        {player.web_name}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">{player.ownership}%</TableCell>
                    <TableCell className="text-right">
                      {player.transfersIn.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={`${getTransferInBadgeColor(player.transferInCoefficient)} text-white`}>
                        {player.transferInCoefficient.toFixed(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="out">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Ownership %</TableHead>
                  <TableHead className="text-right">Transfers Out</TableHead>
                  <TableHead className="text-right">Coefficient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedByTransfersOut.map(player => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => onPlayerClick?.(player)}
                        className="hover:text-primary hover:underline cursor-pointer text-left"
                      >
                        {player.web_name}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">{player.ownership}%</TableCell>
                    <TableCell className="text-right">
                      {player.transfersOut.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={`${getTransferOutBadgeColor(player.transferOutCoefficient)} text-white`}>
                        {player.transferOutCoefficient.toFixed(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

