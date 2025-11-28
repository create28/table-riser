'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChipSet, ChipStrategy as ChipStrategyType } from '@/lib/chip-strategy';
import { Separator } from '@/components/ui/separator';

interface ChipStrategyProps {
    chipSets: ChipSet[];
    currentGameweek: number;
}

export function ChipStrategy({ chipSets, currentGameweek }: ChipStrategyProps) {
    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'high': return 'bg-red-500 hover:bg-red-600';
            case 'medium': return 'bg-orange-500 hover:bg-orange-600';
            case 'low': return 'bg-yellow-500 hover:bg-yellow-600';
            default: return 'bg-gray-500 hover:bg-gray-600';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Available</Badge>;
            case 'used': return <Badge variant="secondary">Used</Badge>;
            case 'unavailable': return <Badge variant="outline" className="text-muted-foreground">Unavailable</Badge>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            {chipSets.map((set, index) => (
                <Card key={index} className={currentGameweek > set.endGw ? "opacity-60" : ""}>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>{set.name}</CardTitle>
                                <CardDescription>
                                    {currentGameweek > set.endGw
                                        ? "Period ended"
                                        : currentGameweek < set.startGw
                                            ? `Starts GW${set.startGw}`
                                            : `${set.endGw - currentGameweek + 1} gameweeks remaining`}
                                </CardDescription>
                            </div>
                            {currentGameweek >= set.startGw && currentGameweek <= set.endGw && (
                                <Badge className="bg-blue-600">Active Period</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {set.chips.map((chip, chipIndex) => (
                                <div key={chipIndex}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{chip.chipName}</span>
                                                {getStatusBadge(chip.status)}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{chip.reason}</p>
                                        </div>

                                        {chip.status === 'available' && (
                                            <div className="text-right">
                                                {chip.recommendedGameweek ? (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs font-medium text-muted-foreground">Recommended</span>
                                                        <Badge className={getUrgencyColor(chip.urgency)}>
                                                            GW{chip.recommendedGameweek}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs font-medium text-muted-foreground">Strategy</span>
                                                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                            Hold
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {chipIndex < set.chips.length - 1 && <Separator className="my-3" />}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
