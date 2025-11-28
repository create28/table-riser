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
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Transfer Pressure</CardTitle>
        <CardDescription>Market trends weighted by ownership</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="in" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-2 h-8">
            <TabsTrigger value="in" className="text-xs">Transfers In</TabsTrigger>
            <TabsTrigger value="out" className="text-xs">Transfers Out</TabsTrigger>
          </TabsList>

          <TabsContent value="in">
            <div className="space-y-1">
              {sortedByTransfersIn.slice(0, 5).map(player => (
                <div key={player.id} className="flex items-center justify-between text-sm p-1 hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getTransferInBadgeColor(player.transferInCoefficient)} text-white h-5 px-1.5 text-[10px]`}>
                      {player.transferInCoefficient.toFixed(1)}
                    </Badge>
                    <button
                      onClick={() => onPlayerClick?.(player)}
                      className="hover:text-primary hover:underline cursor-pointer text-left truncate max-w-[120px]"
                    >
                      {player.web_name}
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {player.transfersIn.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="out">
            <div className="space-y-1">
              {sortedByTransfersOut.slice(0, 5).map(player => (
                <div key={player.id} className="flex items-center justify-between text-sm p-1 hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getTransferOutBadgeColor(player.transferOutCoefficient)} text-white h-5 px-1.5 text-[10px]`}>
                      {player.transferOutCoefficient.toFixed(1)}
                    </Badge>
                    <button
                      onClick={() => onPlayerClick?.(player)}
                      className="hover:text-primary hover:underline cursor-pointer text-left truncate max-w-[120px]"
                    >
                      {player.web_name}
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {player.transfersOut.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

