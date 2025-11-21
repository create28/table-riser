import { Player, Team, Fixture } from './fpl-api';
import { HistoricalSeasonData, findHistoricalMatches } from './historical-data';

export interface OptimizationStrategy {
    timeHorizon: number; // -1 (short-term/form) to 1 (long-term/history)
    riskTolerance: number; // -1 (conservative/safe) to 1 (aggressive/risky)
}

export interface OptimizationSettings {
    budget: number;
    gameweeks: number; // 1 for Free Hit, >1 for Wildcard
    excludePlayers: number[];
    includePlayers: number[];
    historicalData: HistoricalSeasonData[];
    strategy?: OptimizationStrategy; // Optional strategy parameters
}

export interface XPBreakdown {
    basePoints: number;
    recentForm: number;
    seasonPPG: number;
    historicalPPG: number;
    difficultyMultiplier: number;
    homeMultiplier: number;
    confidenceScore: number; // 0-100
}

export interface PlayerWithXP extends Player {
    xP: number;
    xpBreakdown?: XPBreakdown;
}

export interface OptimizedTeam {
    starters: PlayerWithXP[];
    bench: PlayerWithXP[];
    captain: PlayerWithXP;
    viceCaptain: PlayerWithXP;
    totalExpectedPoints: number;
    totalCost: number;
}

// Calculate expected points for a player over a number of gameweeks
export function calculateExpectedPoints(
    player: Player,
    fixtures: Fixture[],
    gameweeks: number,
    historicalData: HistoricalSeasonData[] = [],
    strategy?: OptimizationStrategy
): { totalXP: number, breakdown: XPBreakdown } {
    let totalXP = 0;
    const playerTeam = player.team;

    // Filter fixtures for this player's team
    const upcomingFixtures = fixtures
        .filter(f => (f.team_h === playerTeam || f.team_a === playerTeam) && !f.finished)
        .sort((a, b) => a.event - b.event)
        .slice(0, gameweeks);

    // --- SCORING MODEL ---

    // 1. Recent Form (Last 30 days / 5 GWs approx)
    // 'form' attribute in API is average points per game over last 30 days
    const recentForm = parseFloat(player.form);

    // 2. Season Form (Points Per Game)
    const seasonPPG = parseFloat(player.points_per_game);

    // 3. Historical Baseline (Previous Seasons)
    let historicalPPG = 0;
    let historicalMatchesCount = 0;

    if (historicalData.length > 0) {
        const matches = findHistoricalMatches(player.web_name, historicalData);
        if (matches.length > 0) {
            const totalPoints = matches.reduce((sum, m) => sum + m.totalPoints, 0);
            historicalPPG = totalPoints / matches.length;
            historicalMatchesCount = matches.length;
        }
    }

    // Calculate dynamic weights based on strategy timeHorizon
    // timeHorizon: -1 (short-term) to 1 (long-term)
    const timeHorizon = strategy?.timeHorizon ?? 0;

    // Map timeHorizon to weights
    // Short-term (-1): 70% recent, 20% season, 10% historical
    // Balanced (0): 35% recent, 35% season, 30% historical
    // Long-term (1): 15% recent, 30% season, 55% historical
    let recentWeight = 0.35 - (timeHorizon * 0.275); // -1: 0.625, 0: 0.35, 1: 0.075
    let seasonWeight = 0.35 - (timeHorizon * 0.05);  // -1: 0.40, 0: 0.35, 1: 0.30
    let historyWeight = 0.30 + (timeHorizon * 0.325); // -1: -0.025, 0: 0.30, 1: 0.625

    // Normalize weights to ensure they sum to 1.0
    const totalWeight = recentWeight + seasonWeight + historyWeight;
    recentWeight /= totalWeight;
    seasonWeight /= totalWeight;
    historyWeight /= totalWeight;

    // Weighted Base Points
    // If we have historical data, use it to stabilize the prediction
    let basePoints = 0;
    let confidenceScore = 0;

    if (historicalMatchesCount > 10) {
        // Player has history: Use dynamic weights
        basePoints = (recentForm * recentWeight) + (seasonPPG * seasonWeight) + (historicalPPG * historyWeight);

        // Consistency Bonus: If historical PPG is high (> 4.5), boost slightly
        if (historicalPPG > 4.5) basePoints += 0.5;

        confidenceScore = 90; // High confidence with history
    } else {
        // New player or lack of history: Rely more on recent form
        // Adjust weights when no history available
        const noHistoryRecentWeight = 0.60 - (timeHorizon * 0.10); // -1: 0.70, 0: 0.60, 1: 0.50
        const noHistorySeasonWeight = 0.40 + (timeHorizon * 0.10); // -1: 0.30, 0: 0.40, 1: 0.50

        basePoints = (recentForm * noHistoryRecentWeight) + (seasonPPG * noHistorySeasonWeight);

        if (player.minutes > 500) {
            confidenceScore = 70; // Moderate confidence if played enough this season
        } else {
            confidenceScore = 40; // Low confidence for new/bench players
        }
    }

    // Apply risk tolerance adjustments
    const riskTolerance = strategy?.riskTolerance ?? 0;

    if (riskTolerance < 0) {
        // Conservative: Penalize low-confidence players
        if (confidenceScore < 70) {
            basePoints *= (1 + (riskTolerance * 0.3)); // Reduce up to 30% for low confidence
        }
        // Bonus for high minutes played (proven starters)
        if (player.minutes > 1500) {
            basePoints *= 1.05; // 5% bonus for nailed-on players
        }
    } else if (riskTolerance > 0) {
        // Aggressive: Boost high-upside players
        // Reward players with high ceiling (good form even if inconsistent)
        if (recentForm > seasonPPG * 1.2) {
            basePoints *= (1 + (riskTolerance * 0.15)); // Up to 15% boost for in-form players
        }
        // Accept rotation risks if xP is high
        if (player.minutes < 1000 && basePoints > 5) {
            basePoints *= (1 + (riskTolerance * 0.1)); // Up to 10% boost for differential picks
        }
    }

    // If player has no minutes, return 0 (unless high chance of playing)
    if (player.minutes === 0 && player.chance_of_playing_next_round !== 100) {
        return {
            totalXP: 0,
            breakdown: {
                basePoints, recentForm, seasonPPG, historicalPPG,
                difficultyMultiplier: 0, homeMultiplier: 0, confidenceScore
            }
        };
    }

    // Check injury status
    if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined && player.chance_of_playing_next_round < 75) {
        return {
            totalXP: 0,
            breakdown: {
                basePoints, recentForm, seasonPPG, historicalPPG,
                difficultyMultiplier: 0, homeMultiplier: 0, confidenceScore: 100 // Confident they won't play
            }
        };
    }

    let avgDifficultyMultiplier = 0;
    let avgHomeMultiplier = 0;

    for (const fixture of upcomingFixtures) {
        const isHome = fixture.team_h === playerTeam;
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;

        // Difficulty multiplier (easier = higher multiplier)
        // Difficulty 1-5.
        // 1 -> 1.25x (Was 1.3)
        // 2 -> 1.15x (Was 1.2)
        // 3 -> 1.0x
        // 4 -> 0.85x (Was 0.9)
        // 5 -> 0.7x (Was 0.8)
        // Adjusted to be slightly more conservative on the high end but harsher on the low end
        let difficultyMultiplier = 1.0;
        if (difficulty === 1) difficultyMultiplier = 1.25;
        else if (difficulty === 2) difficultyMultiplier = 1.15;
        else if (difficulty === 3) difficultyMultiplier = 1.0;
        else if (difficulty === 4) difficultyMultiplier = 0.85;
        else if (difficulty >= 5) difficultyMultiplier = 0.7;

        // Home advantage multiplier
        // Reduced slightly: 1.1 -> 1.05
        const homeMultiplier = isHome ? 1.05 : 0.95;

        let matchXP = basePoints * difficultyMultiplier * homeMultiplier;

        // Removed flat bonuses to avoid double counting.
        // The basePoints (PPG) already accounts for the player's average return (goals/CS).
        // The multipliers scale this average based on fixture difficulty.

        totalXP += matchXP;

        avgDifficultyMultiplier += difficultyMultiplier;
        avgHomeMultiplier += homeMultiplier;
    }

    if (upcomingFixtures.length > 0) {
        avgDifficultyMultiplier /= upcomingFixtures.length;
        avgHomeMultiplier /= upcomingFixtures.length;
    }

    return {
        totalXP,
        breakdown: {
            basePoints,
            recentForm,
            seasonPPG,
            historicalPPG,
            difficultyMultiplier: avgDifficultyMultiplier,
            homeMultiplier: avgHomeMultiplier,
            confidenceScore
        }
    };
}

// Greedy optimization algorithm
export function optimizeTeam(
    allPlayers: Player[],
    fixtures: Fixture[],
    settings: OptimizationSettings
): OptimizedTeam {
    // 1. Calculate xP for all players
    const playersWithXP: PlayerWithXP[] = allPlayers.map(p => {
        const { totalXP, breakdown } = calculateExpectedPoints(
            p,
            fixtures,
            settings.gameweeks,
            settings.historicalData,
            settings.strategy // Pass strategy through
        );
        return {
            ...p,
            xP: totalXP,
            xpBreakdown: breakdown
        };
    }).filter(p => p.xP > 0); // Remove players with 0 xP

    // 2. Sort by xP descending
    playersWithXP.sort((a, b) => b.xP - a.xP);

    // 3. Select best players satisfying constraints
    const selectedPlayers: typeof playersWithXP = [];
    const teamCounts: { [key: number]: number } = {};
    let currentCost = 0;

    // Helper to check constraints
    const canAddPlayer = (player: typeof playersWithXP[0]) => {
        if (currentCost + player.now_cost > settings.budget * 10) return false; // Budget check (cost is in 0.1m)
        if ((teamCounts[player.team] || 0) >= 3) return false; // Max 3 per team
        return true;
    };

    // Force include players
    for (const id of settings.includePlayers) {
        const player = playersWithXP.find(p => p.id === id);
        if (player && canAddPlayer(player)) {
            selectedPlayers.push(player);
            teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
            currentCost += player.now_cost;
        }
    }

    // Fill positions
    // Requirements: 2 GK, 5 DEF, 5 MID, 3 FWD
    const requirements = { 1: 2, 2: 5, 3: 5, 4: 3 };
    const currentCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    // Update counts from forced includes
    selectedPlayers.forEach(p => {
        currentCounts[p.element_type as keyof typeof currentCounts]++;
    });

    // Fill remaining slots with best available players
    // Sort players by position for easier selection
    const playersByPosition: { [key: number]: PlayerWithXP[] } = {
        1: playersWithXP.filter(p => p.element_type === 1).sort((a, b) => b.xP - a.xP),
        2: playersWithXP.filter(p => p.element_type === 2).sort((a, b) => b.xP - a.xP),
        3: playersWithXP.filter(p => p.element_type === 3).sort((a, b) => b.xP - a.xP),
        4: playersWithXP.filter(p => p.element_type === 4).sort((a, b) => b.xP - a.xP),
    };

    // Try to fill each position
    for (const [posStr, required] of Object.entries(requirements)) {
        const position = parseInt(posStr) as keyof typeof currentCounts;
        const needed = required - currentCounts[position];

        if (needed <= 0) continue;

        const availablePlayers = playersByPosition[position].filter(p =>
            !selectedPlayers.find(sp => sp.id === p.id) &&
            !settings.excludePlayers.includes(p.id) &&
            (teamCounts[p.team] || 0) < 3
        );

        // Try to add players for this position
        for (let i = 0; i < needed && availablePlayers.length > 0; i++) {
            let added = false;

            // Try players in order of xP, but check budget
            for (const player of availablePlayers) {
                if (selectedPlayers.find(sp => sp.id === player.id)) continue;

                if (canAddPlayer(player)) {
                    selectedPlayers.push(player);
                    teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
                    currentCost += player.now_cost;
                    currentCounts[position]++;
                    added = true;
                    break;
                }
            }

            // If we couldn't add anyone due to budget, we need to make room
            if (!added && availablePlayers.length > 0) {
                // Find the most expensive player we can swap out
                const expensivePlayers = selectedPlayers
                    .filter(p => p.element_type !== position) // Don't swap same position
                    .sort((a, b) => b.now_cost - a.now_cost);

                for (const expensive of expensivePlayers) {
                    // Try to find a cheaper replacement for this player
                    const expensivePos = expensive.element_type as keyof typeof currentCounts;

                    // Calculate team counts after removing expensive player
                    const tempTeamCounts = { ...teamCounts };
                    tempTeamCounts[expensive.team]--;

                    const cheaperAlternatives = playersByPosition[expensivePos]
                        .filter(p =>
                            !selectedPlayers.find(sp => sp.id === p.id) &&
                            !settings.excludePlayers.includes(p.id) &&
                            p.now_cost < expensive.now_cost &&
                            (tempTeamCounts[p.team] || 0) < 3 // Check against temp counts
                        )
                        .sort((a, b) => b.xP - a.xP); // Best cheaper alternative

                    if (cheaperAlternatives.length > 0) {
                        const replacement = cheaperAlternatives[0];

                        // Check if swapping would allow us to add the player we want
                        const targetPlayer = availablePlayers.find(p =>
                            !selectedPlayers.find(sp => sp.id === p.id) &&
                            currentCost - expensive.now_cost + replacement.now_cost + p.now_cost <= settings.budget * 10 &&
                            (tempTeamCounts[p.team] || 0) < 3 // Check target player team count too
                        );

                        if (targetPlayer) {
                            // Perform the swap
                            const idx = selectedPlayers.indexOf(expensive);
                            selectedPlayers.splice(idx, 1);
                            teamCounts[expensive.team]--;
                            currentCost -= expensive.now_cost;

                            selectedPlayers.push(replacement);
                            teamCounts[replacement.team] = (teamCounts[replacement.team] || 0) + 1;
                            currentCost += replacement.now_cost;

                            // Now add the target player
                            selectedPlayers.push(targetPlayer);
                            teamCounts[targetPlayer.team] = (teamCounts[targetPlayer.team] || 0) + 1;
                            currentCost += targetPlayer.now_cost;
                            currentCounts[position]++;
                            added = true;
                            break;
                        }
                    }
                }
            }

            if (!added) break; // Can't add more players for this position
        }
    }

    // Final budget validation - if over budget, replace most expensive bench players with cheapest options
    while (currentCost > settings.budget * 10 && selectedPlayers.length === 15) {
        // Find bench-worthy players (lowest xP) that are expensive
        const sortedByXP = [...selectedPlayers].sort((a, b) => a.xP - b.xP);
        const benchPlayers = sortedByXP.slice(0, 4); // Likely bench players

        let swapped = false;
        for (const expensive of benchPlayers.sort((a, b) => b.now_cost - a.now_cost)) {
            const pos = expensive.element_type as keyof typeof currentCounts;

            // Calculate team counts after removing expensive player
            const tempTeamCounts = { ...teamCounts };
            tempTeamCounts[expensive.team]--;

            // Find cheapest replacement for this position
            const cheaperOptions = playersByPosition[pos]
                .filter(p =>
                    !selectedPlayers.find(sp => sp.id === p.id) &&
                    !settings.excludePlayers.includes(p.id) &&
                    p.now_cost < expensive.now_cost &&
                    (tempTeamCounts[p.team] || 0) < 3
                )
                .sort((a, b) => a.now_cost - b.now_cost); // Cheapest first

            if (cheaperOptions.length > 0) {
                const replacement = cheaperOptions[0];
                const savings = expensive.now_cost - replacement.now_cost;

                if (currentCost - savings <= settings.budget * 10) {
                    // Perform swap
                    const idx = selectedPlayers.indexOf(expensive);
                    selectedPlayers.splice(idx, 1);
                    teamCounts[expensive.team]--;
                    currentCost -= expensive.now_cost;

                    selectedPlayers.push(replacement);
                    teamCounts[replacement.team] = (teamCounts[replacement.team] || 0) + 1;
                    currentCost += replacement.now_cost;

                    swapped = true;
                    break;
                }
            }
        }

        if (!swapped) break; // Can't reduce budget further
    }

    // If we couldn't fill the team (e.g. budget too low), we might need a fallback or retry with cheaper players
    // For now, we'll return what we have, but in a real solver we'd backtrack.
    // Simple fallback: if over budget, replace expensive low-value bench players with cheapest fodder.

    // 4. Determine Starters vs Bench
    // Valid formations: 1 GK. Min 3 DEF, 2 MID, 1 FWD. Total 11 starters.
    // We want to maximize starter xP.

    // Separate GKs
    const gks = selectedPlayers.filter(p => p.element_type === 1).sort((a, b) => b.xP - a.xP);
    const outfield = selectedPlayers.filter(p => p.element_type !== 1).sort((a, b) => b.xP - a.xP);

    const starters: typeof playersWithXP = [gks[0]];
    const bench: typeof playersWithXP = [gks[1]];

    // Greedily pick best 10 outfield players, ensuring valid formation
    // Actually, it's easier to pick the best 10, then check if valid. If not, swap.
    // Valid formations:
    // 3-5-2, 3-4-3, 4-5-1, 4-4-2, 4-3-3, 5-4-1, 5-3-2, 5-2-3 (rare)
    // Basically: Min 3 DEF, Min 1 FWD. (Mids usually > 2)

    // Let's just take top 10 outfield.
    const top10Outfield = outfield.slice(0, 10);
    const remainingOutfield = outfield.slice(10);

    // Check constraints
    const defCount = top10Outfield.filter(p => p.element_type === 2).length;
    const fwdCount = top10Outfield.filter(p => p.element_type === 4).length;

    if (defCount < 3) {
        // Need more defenders. Swap worst non-def starter with best def bencher.
        const bestBenchDef = remainingOutfield.find(p => p.element_type === 2);
        if (bestBenchDef) {
            // Find worst non-def, non-fwd (if fwd count is low) starter
            // Actually just swap worst non-def starter
            const worstStarter = [...top10Outfield].reverse().find(p => p.element_type !== 2);
            if (worstStarter) {
                // Swap
                const idxS = top10Outfield.indexOf(worstStarter);
                const idxB = remainingOutfield.indexOf(bestBenchDef);
                top10Outfield[idxS] = bestBenchDef;
                remainingOutfield[idxB] = worstStarter;
            }
        }
    }

    // Re-check fwd count (though usually we have enough if we picked best players)
    const fwdCountNew = top10Outfield.filter(p => p.element_type === 4).length;
    if (fwdCountNew < 1) {
        const bestBenchFwd = remainingOutfield.find(p => p.element_type === 4);
        if (bestBenchFwd) {
            const worstStarter = [...top10Outfield].reverse().find(p => p.element_type !== 4 && (p.element_type !== 2 || defCount > 3));
            if (worstStarter) {
                const idxS = top10Outfield.indexOf(worstStarter);
                const idxB = remainingOutfield.indexOf(bestBenchFwd);
                top10Outfield[idxS] = bestBenchFwd;
                remainingOutfield[idxB] = worstStarter;
            }
        }
    }

    starters.push(...top10Outfield);
    bench.push(...remainingOutfield);

    // 5. Captaincy
    const sortedStarters = [...starters].sort((a, b) => b.xP - a.xP);
    const captain = sortedStarters[0];
    const viceCaptain = sortedStarters[1];

    return {
        starters,
        bench,
        captain,
        viceCaptain,
        totalExpectedPoints: starters.reduce((sum, p) => sum + p.xP, 0) + captain.xP, // Cap gets double
        totalCost: currentCost
    };
}

/**
 * Create the best team with a total cost of 100.0m
 * This is a convenience function that wraps optimizeTeam with standard settings
 * 
 * @param allPlayers - Array of all available players
 * @param fixtures - Array of upcoming fixtures
 * @param gameweeks - Number of gameweeks to optimize for (default: 1 for Free Hit)
 * @param historicalData - Optional historical season data for better predictions
 * @param excludePlayers - Optional array of player IDs to exclude
 * @param includePlayers - Optional array of player IDs to force include
 * @param strategy - Optional strategy settings for time horizon and risk tolerance
 * @returns OptimizedTeam with 100.0m budget
 */
export function createBestTeam(
    allPlayers: Player[],
    fixtures: Fixture[],
    gameweeks: number = 1,
    historicalData: HistoricalSeasonData[] = [],
    excludePlayers: number[] = [],
    includePlayers: number[] = [],
    strategy?: OptimizationStrategy
): OptimizedTeam {
    const settings: OptimizationSettings = {
        budget: 100.0,
        gameweeks,
        excludePlayers,
        includePlayers,
        historicalData,
        strategy
    };

    return optimizeTeam(allPlayers, fixtures, settings);
}
