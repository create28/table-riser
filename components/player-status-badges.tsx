'use client';

import { Player } from '@/lib/fpl-api';
import { calculateRotationRisk, getInjuryStatus } from '@/lib/player-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlayerStatusBadgesProps {
    player: Player;
    playerHistory?: any;
    showRotationRisk?: boolean;
    showInjury?: boolean;
}

export function PlayerStatusBadges({
    player,
    playerHistory,
    showRotationRisk = true,
    showInjury = true
}: PlayerStatusBadgesProps) {
    const injuryStatus = getInjuryStatus(player);
    const rotationRisk = playerHistory ? calculateRotationRisk(playerHistory) : null;

    return (
        <div className="inline-flex items-center gap-1 ml-1">
            {/* Injury Status */}
            {showInjury && injuryStatus.status !== 'available' && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <span className={`text-xs ${injuryStatus.status === 'injured'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-orange-600 dark:text-orange-400'
                                }`}>
                                🏥
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="text-xs">
                                <p className="font-semibold">
                                    {injuryStatus.status === 'injured' ? 'Injured/Suspended' : 'Doubtful'}
                                </p>
                                {injuryStatus.percentage !== null && (
                                    <p>{injuryStatus.percentage}% chance of playing</p>
                                )}
                                {injuryStatus.news && (
                                    <p className="mt-1 text-muted-foreground">{injuryStatus.news}</p>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* Rotation Risk */}
            {showRotationRisk && rotationRisk && rotationRisk.isRisk && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                ⚠️
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="text-xs">
                                <p className="font-semibold">Rotation Risk</p>
                                <p>Starts {rotationRisk.startPercentage.toFixed(0)}% of games</p>
                                <p className="text-muted-foreground">
                                    ({rotationRisk.gamesAnalyzed} games analyzed)
                                </p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}
