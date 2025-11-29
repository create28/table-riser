import { Player, Team, Fixture } from './fpl-api';

export interface PerformanceBreakdown {
    fdr1: { home: number; away: number; count: number; games: number[] };
    fdr2: { home: number; away: number; count: number; games: number[] };
    fdr3: { home: number; away: number; count: number; games: number[] };
    fdr4: { home: number; away: number; count: number; games: number[] };
    fdr5: { home: number; away: number; count: number; games: number[] };
    overall: {
        homeAvg: number;
        awayAvg: number;
        totalGames: number;
    };
}

export interface PerformanceInsight {
    type: 'strength' | 'weakness' | 'neutral';
    message: string;
    impact: number; // percentage difference from average
}

/**
 * Get fixture difficulty for a specific team in a fixture
 */
export function getFixtureDifficulty(
    fixture: any,
    teamId: number,
    teams: Team[]
): { difficulty: number; isHome: boolean; opponent: Team | null } {
    const isHome = fixture.team_h === teamId;
    const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;
    const opponent = teams.find(t => t.id === opponentId) || null;

    return { difficulty, isHome, opponent };
}

/**
 * Analyze player performance broken down by FDR and home/away
 */
export function analyzePlayerPerformance(
    player: Player,
    playerHistory: any,
    fixtures: Fixture[],
    teams: Team[]
): PerformanceBreakdown {
    const breakdown: PerformanceBreakdown = {
        fdr1: { home: 0, away: 0, count: 0, games: [] },
        fdr2: { home: 0, away: 0, count: 0, games: [] },
        fdr3: { home: 0, away: 0, count: 0, games: [] },
        fdr4: { home: 0, away: 0, count: 0, games: [] },
        fdr5: { home: 0, away: 0, count: 0, games: [] },
        overall: { homeAvg: 0, awayAvg: 0, totalGames: 0 }
    };

    if (!playerHistory || !playerHistory.history) return breakdown;

    const history = playerHistory.history;
    let totalHomePoints = 0;
    let totalAwayPoints = 0;
    let homeGames = 0;
    let awayGames = 0;

    history.forEach((game: any) => {
        const gameweek = game.round;
        const points = game.total_points;

        // Find the fixture for this gameweek
        const fixture = fixtures.find(f =>
            f.event === gameweek &&
            (f.team_h === player.team || f.team_a === player.team)
        );

        if (!fixture) return;

        const { difficulty, isHome } = getFixtureDifficulty(fixture, player.team, teams);

        // Update breakdown by FDR
        const fdrKey = `fdr${difficulty}` as keyof Omit<PerformanceBreakdown, 'overall'>;
        if (breakdown[fdrKey]) {
            if (isHome) {
                breakdown[fdrKey].home += points;
                homeGames++;
                totalHomePoints += points;
            } else {
                breakdown[fdrKey].away += points;
                awayGames++;
                totalAwayPoints += points;
            }
            breakdown[fdrKey].count++;
            breakdown[fdrKey].games.push(gameweek);
        }
    });

    // Calculate averages
    Object.keys(breakdown).forEach(key => {
        if (key !== 'overall') {
            const fdrData = breakdown[key as keyof Omit<PerformanceBreakdown, 'overall'>];
            if (fdrData.count > 0) {
                const homeCount = fdrData.games.filter((gw: number) => {
                    const fixture = fixtures.find(f => f.event === gw && (f.team_h === player.team || f.team_a === player.team));
                    return fixture && fixture.team_h === player.team;
                }).length;
                const awayCount = fdrData.count - homeCount;

                fdrData.home = homeCount > 0 ? fdrData.home / homeCount : 0;
                fdrData.away = awayCount > 0 ? fdrData.away / awayCount : 0;
            }
        }
    });

    breakdown.overall = {
        homeAvg: homeGames > 0 ? totalHomePoints / homeGames : 0,
        awayAvg: awayGames > 0 ? totalAwayPoints / awayGames : 0,
        totalGames: homeGames + awayGames
    };

    return breakdown;
}

/**
 * Generate insights from performance breakdown
 */
export function categorizePerformance(breakdown: PerformanceBreakdown): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];
    const overallAvg = (breakdown.overall.homeAvg + breakdown.overall.awayAvg) / 2;

    if (overallAvg === 0 || breakdown.overall.totalGames < 5) {
        return [{ type: 'neutral', message: 'Insufficient data for analysis', impact: 0 }];
    }

    // Home vs Away analysis
    const homeAwayDiff = ((breakdown.overall.homeAvg - breakdown.overall.awayAvg) / overallAvg) * 100;
    if (Math.abs(homeAwayDiff) > 20) {
        if (homeAwayDiff > 0) {
            insights.push({
                type: 'strength',
                message: `Strong home performer (+${homeAwayDiff.toFixed(0)}% vs away)`,
                impact: homeAwayDiff
            });
        } else {
            insights.push({
                type: 'strength',
                message: `Better away from home (+${Math.abs(homeAwayDiff).toFixed(0)}% vs home)`,
                impact: Math.abs(homeAwayDiff)
            });
        }
    }

    // FDR analysis - Easy opponents (FDR 1-2)
    const easyHome = (breakdown.fdr1.home + breakdown.fdr2.home) / 2;
    const easyAway = (breakdown.fdr1.away + breakdown.fdr2.away) / 2;
    const easyAvg = (easyHome + easyAway) / 2;

    if (easyAvg > 0 && (breakdown.fdr1.count + breakdown.fdr2.count) >= 3) {
        const easyDiff = ((easyAvg - overallAvg) / overallAvg) * 100;
        if (easyDiff > 25) {
            insights.push({
                type: 'strength',
                message: `Excels vs easy opponents (+${easyDiff.toFixed(0)}% vs average)`,
                impact: easyDiff
            });
        }
    }

    // FDR analysis - Tough opponents (FDR 4-5)
    const hardHome = (breakdown.fdr4.home + breakdown.fdr5.home) / 2;
    const hardAway = (breakdown.fdr4.away + breakdown.fdr5.away) / 2;
    const hardAvg = (hardHome + hardAway) / 2;

    if (hardAvg > 0 && (breakdown.fdr4.count + breakdown.fdr5.count) >= 3) {
        const hardDiff = ((hardAvg - overallAvg) / overallAvg) * 100;
        if (hardDiff < -25) {
            insights.push({
                type: 'weakness',
                message: `Struggles vs tough opponents (${hardDiff.toFixed(0)}% vs average)`,
                impact: Math.abs(hardDiff)
            });
        } else if (hardDiff > 15) {
            insights.push({
                type: 'strength',
                message: `Big game player (+${hardDiff.toFixed(0)}% vs tough teams)`,
                impact: hardDiff
            });
        }
    }

    // Best scenario
    let bestScenario = { fdr: 0, location: '', avg: 0 };
    Object.keys(breakdown).forEach(key => {
        if (key !== 'overall') {
            const fdrData = breakdown[key as keyof Omit<PerformanceBreakdown, 'overall'>];
            if (fdrData.home > bestScenario.avg && fdrData.count > 0) {
                bestScenario = { fdr: parseInt(key.replace('fdr', '')), location: 'home', avg: fdrData.home };
            }
            if (fdrData.away > bestScenario.avg && fdrData.count > 0) {
                bestScenario = { fdr: parseInt(key.replace('fdr', '')), location: 'away', avg: fdrData.away };
            }
        }
    });

    if (bestScenario.avg > overallAvg * 1.2) {
        const fdrLabel = ['', 'easy', 'favorable', 'moderate', 'difficult', 'tough'][bestScenario.fdr];
        insights.push({
            type: 'strength',
            message: `Best vs ${fdrLabel} opponents ${bestScenario.location} (avg ${bestScenario.avg.toFixed(1)} pts)`,
            impact: ((bestScenario.avg - overallAvg) / overallAvg) * 100
        });
    }

    return insights.length > 0 ? insights : [
        { type: 'neutral', message: 'Consistent performer across all scenarios', impact: 0 }
    ];
}
