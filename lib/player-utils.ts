import { Player } from './fpl-api';

export interface RotationRiskInfo {
    isRisk: boolean;
    startPercentage: number;
    gamesAnalyzed: number;
}

export interface InjuryStatus {
    status: 'available' | 'doubt' | 'injured';
    percentage: number | null;
    news: string | null;
}

/**
 * Calculate rotation risk based on player's recent minutes
 * @param playerHistory - Player history data from FPL API
 * @returns Rotation risk information
 */
export function calculateRotationRisk(playerHistory: any): RotationRiskInfo {
    if (!playerHistory || !playerHistory.history || playerHistory.history.length === 0) {
        return {
            isRisk: false,
            startPercentage: 0,
            gamesAnalyzed: 0
        };
    }

    // Get last 5 gameweeks
    const recentGames = playerHistory.history.slice(-5);

    // Calculate how many games they started (>60 mins)
    const gamesStarted = recentGames.filter((g: any) => g.minutes >= 60).length;
    const startPercentage = (gamesStarted / recentGames.length) * 100;

    // Consider rotation risk if they start less than 80% of games
    const isRisk = startPercentage < 80;

    return {
        isRisk,
        startPercentage,
        gamesAnalyzed: recentGames.length
    };
}

/**
 * Get injury/availability status for a player
 * @param player - Player data from FPL API
 * @returns Injury status information
 */
export function getInjuryStatus(player: Player): InjuryStatus {
    const chance = player.chance_of_playing_next_round;
    const news = player.news || null;

    // No injury data
    if (chance === null || chance === undefined) {
        // Check news for keywords
        if (news && (news.toLowerCase().includes('injured') || news.toLowerCase().includes('suspended'))) {
            return {
                status: 'injured',
                percentage: 0,
                news
            };
        }
        return {
            status: 'available',
            percentage: 100,
            news: null
        };
    }

    // Has chance of playing data
    if (chance === 0) {
        return {
            status: 'injured',
            percentage: 0,
            news
        };
    } else if (chance < 75) {
        return {
            status: 'doubt',
            percentage: chance,
            news
        };
    } else {
        return {
            status: 'available',
            percentage: chance,
            news
        };
    }
}

/**
 * Get a unique set of player IDs that appear on the dashboard
 * This includes squad players and players shown in various components
 */
export function getVisiblePlayerIds(
    squadPlayers: Player[],
    allPlayers: Player[]
): Set<number> {
    const visibleIds = new Set<number>();

    // Add squad players
    squadPlayers.forEach(p => visibleIds.add(p.id));

    // Add top performers (shown in PlayerForm, ValueEfficiency, etc.)
    const topByPoints = [...allPlayers]
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 100); // Top 100 by points

    topByPoints.forEach(p => visibleIds.add(p.id));

    // Add top by form
    const topByForm = [...allPlayers]
        .filter(p => p.minutes > 300)
        .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
        .slice(0, 50);

    topByForm.forEach(p => visibleIds.add(p.id));

    // Add top by value efficiency
    const topByValue = [...allPlayers]
        .filter(p => p.total_points > 0 && p.minutes > 300)
        .sort((a, b) => {
            const valueA = a.total_points / (a.now_cost / 10);
            const valueB = b.total_points / (b.now_cost / 10);
            return valueB - valueA;
        })
        .slice(0, 50);

    topByValue.forEach(p => visibleIds.add(p.id));

    return visibleIds;
}
