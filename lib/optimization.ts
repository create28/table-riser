import { Player, Team, Fixture } from './fpl-api';
import { HistoricalSeasonData, findHistoricalMatches } from './historical-data';
import { AlgorithmWeights } from './ml-learning-engine';

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
    chipType?: 'freehit' | 'wildcard' | 'bestteam';
    weights?: AlgorithmWeights; // ML Weights
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

export interface LineupOptimization {
    starters: PlayerWithXP[];
    bench: PlayerWithXP[];
    captain: PlayerWithXP;
    viceCaptain: PlayerWithXP;
    formation: string; // e.g., "3-4-3"
    totalExpectedPoints: number;
}

// Calculate expected points for a player over a number of gameweeks
export function calculateExpectedPoints(
    player: Player,
    fixtures: Fixture[],
    gameweeks: number,
    historicalData: HistoricalSeasonData[] = [],
    strategy?: OptimizationStrategy,
    weights?: AlgorithmWeights
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

    let basePoints = 0;
    let confidenceScore = 0;

    if (weights) {
        // --- ML MODEL LOGIC ---
        // Use learned weights to balance Form vs Season
        const wForm = weights.formWeight;
        // We assume the remainder goes to Season PPG (ignoring history for simplicity in ML mode)
        // Or we can split it. Let's give 80% of remainder to Season, 20% to History if available.
        const remainder = 1 - wForm;
        const wSeason = remainder * (historicalMatchesCount > 0 ? 0.8 : 1.0);
        const wHistory = remainder * (historicalMatchesCount > 0 ? 0.2 : 0.0);

        basePoints = (recentForm * wForm) + (seasonPPG * wSeason) + (historicalPPG * wHistory);

        // ICT Index Bonus
        const ict = parseFloat(player.ict_index);
        basePoints += (ict * weights.ictWeight);

        confidenceScore = 80; // ML model is confident
    } else {
        // --- TRADITIONAL LOGIC ---
        // Calculate dynamic weights based on strategy timeHorizon
        const timeHorizon = strategy?.timeHorizon ?? 0;

        let recentWeight = 0.35 - (timeHorizon * 0.275);
        let seasonWeight = 0.35 - (timeHorizon * 0.05);
        let historyWeight = 0.30 + (timeHorizon * 0.325);

        const totalWeight = recentWeight + seasonWeight + historyWeight;
        recentWeight /= totalWeight;
        seasonWeight /= totalWeight;
        historyWeight /= totalWeight;

        if (historicalMatchesCount > 10) {
            basePoints = (recentForm * recentWeight) + (seasonPPG * seasonWeight) + (historicalPPG * historyWeight);
            if (historicalPPG > 4.5) basePoints += 0.5;
            confidenceScore = 90;
        } else {
            const noHistoryRecentWeight = 0.60 - (timeHorizon * 0.10);
            const noHistorySeasonWeight = 0.40 + (timeHorizon * 0.10);
            basePoints = (recentForm * noHistoryRecentWeight) + (seasonPPG * noHistorySeasonWeight);
            confidenceScore = player.minutes > 500 ? 70 : 40;
        }
    }

    // Apply risk tolerance adjustments
    const riskTolerance = strategy?.riskTolerance ?? 0;

    if (riskTolerance < 0) {
        if (confidenceScore < 70) basePoints *= (1 + (riskTolerance * 0.3));
        if (player.minutes > 1500) basePoints *= 1.05;
    } else if (riskTolerance > 0) {
        if (recentForm > seasonPPG * 1.2) basePoints *= (1 + (riskTolerance * 0.15));
        if (player.minutes < 1000 && basePoints > 5) basePoints *= (1 + (riskTolerance * 0.1));
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

    // Check injury status and apply probability multiplier
    let injuryMultiplier = 1.0;

    if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined) {
        injuryMultiplier = player.chance_of_playing_next_round / 100;
        if (injuryMultiplier === 0) {
            return {
                totalXP: 0,
                breakdown: {
                    basePoints, recentForm, seasonPPG, historicalPPG,
                    difficultyMultiplier: 0, homeMultiplier: 0, confidenceScore: 0
                }
            };
        }
    } else if (player.news && player.news.length > 0) {
        const lowerNews = player.news.toLowerCase();
        if (lowerNews.includes('suspended') || lowerNews.includes('injury') || lowerNews.includes('unavailable')) {
            if (!lowerNews.includes('expected back') && !lowerNews.includes('available')) {
                injuryMultiplier = 0;
            }
        }
    }

    basePoints *= injuryMultiplier;

    let avgDifficultyMultiplier = 0;
    let avgHomeMultiplier = 0;

    for (const fixture of upcomingFixtures) {
        const isHome = fixture.team_h === playerTeam;
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;

        let difficultyMultiplier = 1.0;
        if (difficulty === 1) difficultyMultiplier = 1.25;
        else if (difficulty === 2) difficultyMultiplier = 1.15;
        else if (difficulty === 3) difficultyMultiplier = 1.0;
        else if (difficulty === 4) difficultyMultiplier = 0.85;
        else if (difficulty >= 5) difficultyMultiplier = 0.7;

        // Adjust Difficulty Multiplier based on ML Weights
        if (weights) {
            // If fixtureWeight is 0.3 (default), we keep it as is.
            // If fixtureWeight is > 0.3, we amplify the effect.
            // If fixtureWeight is < 0.3, we dampen the effect.
            const defaultWeight = 0.3;
            const factor = weights.fixtureWeight / defaultWeight;

            // Apply factor to the deviation from 1.0
            difficultyMultiplier = 1.0 + (difficultyMultiplier - 1.0) * factor;
        }

        const homeMultiplier = isHome ? 1.05 : 0.95;

        let matchXP = basePoints * difficultyMultiplier * homeMultiplier;
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
    const currentCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    // Helper to check constraints
    const canAddPlayer = (player: typeof playersWithXP[0]) => {
        if (currentCost + player.now_cost > settings.budget * 10) return false; // Budget check (cost is in 0.1m)
        if ((teamCounts[player.team] || 0) >= 3) return false; // Max 3 per team
        return true;
    };

    // --- FREE HIT LOGIC: Fill bench with fodder first ---
    if (settings.chipType === 'freehit') {
        // Strategy: Pick 1 GK, 1 DEF, 1 MID, 1 FWD as cheapest possible fodder
        // This leaves 1 GK, 4 DEF, 4 MID, 2 FWD for starters (flexible enough)

        const fodderTypes = [1, 2, 3, 4];

        for (const type of fodderTypes) {
            // Find cheapest player of this type who plays (minutes > 0 implies they exist in game)
            // Actually for fodder we just want cheapest. But maybe avoid 0 minutes if possible?
            // User said "bench with players that play and don't cost much".
            // So sort by Cost ASC, then Minutes DESC
            const candidates = allPlayers
                .filter(p => p.element_type === type && !settings.excludePlayers.includes(p.id))
                .sort((a, b) => {
                    // Primary Sort: Cost ASC
                    if (a.now_cost !== b.now_cost) return a.now_cost - b.now_cost;
                    // Secondary Sort: Minutes DESC
                    return b.minutes - a.minutes;
                });

            // Filter for "playing fodder" (PPG >= 2)
            // If we can't find any cheap players with decent PPG, we fallback to just cheapest
            const playingCandidates = candidates.filter(p => parseFloat(p.points_per_game) >= 2.0);

            // Use playing candidates if available, otherwise fallback to any candidate
            const finalCandidates = playingCandidates.length > 0 ? playingCandidates : candidates;

            // Find first valid candidate
            for (const candidate of finalCandidates) {
                // We need to convert to PlayerWithXP structure (even with 0 xP is fine for fodder)
                const candidateWithXP = playersWithXP.find(p => p.id === candidate.id) || {
                    ...candidate,
                    xP: 0,
                    xpBreakdown: undefined
                } as PlayerWithXP;

                if (canAddPlayer(candidateWithXP)) {
                    selectedPlayers.push(candidateWithXP);
                    teamCounts[candidate.team] = (teamCounts[candidate.team] || 0) + 1;
                    currentCost += candidate.now_cost;
                    currentCounts[type as keyof typeof currentCounts]++;
                    break; // Found fodder for this type
                }
            }
        }
    }

    // Force include players (skip if already added as fodder)
    for (const id of settings.includePlayers) {
        if (selectedPlayers.find(p => p.id === id)) continue;

        const player = playersWithXP.find(p => p.id === id);
        if (player && canAddPlayer(player)) {
            selectedPlayers.push(player);
            teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
            currentCost += player.now_cost;
            currentCounts[player.element_type as keyof typeof currentCounts]++;
        }
    }

    // Fill positions
    // Requirements: 2 GK, 5 DEF, 5 MID, 3 FWD
    const requirements = { 1: 2, 2: 5, 3: 5, 4: 3 };

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
                        const savings = expensive.now_cost - replacement.now_cost;

                        // Check if swapping would allow us to add the player we want
                        // We need to find *any* player for the target position that fits
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
                            currentCounts[expensivePos]--; // Decrement count for removed player type

                            selectedPlayers.push(replacement);
                            teamCounts[replacement.team] = (teamCounts[replacement.team] || 0) + 1;
                            currentCost += replacement.now_cost;
                            currentCounts[expensivePos]++; // Increment count for replacement (same type)

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
    // For Free Hit, we likely already have cheap bench, but this is a safety net
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
                    currentCounts[pos]--;

                    selectedPlayers.push(replacement);
                    teamCounts[replacement.team] = (teamCounts[replacement.team] || 0) + 1;
                    currentCost += replacement.now_cost;
                    currentCounts[pos]++;

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

    if (defCount < 3) {
        // Need more defenders. Swap worst non-def starter with best def bencher.
        const bestBenchDef = remainingOutfield.find(p => p.element_type === 2);
        if (bestBenchDef) {
            const worstStarter = [...top10Outfield].reverse().find(p => p.element_type !== 2);
            if (worstStarter) {
                const idxS = top10Outfield.indexOf(worstStarter);
                const idxB = remainingOutfield.indexOf(bestBenchDef);
                top10Outfield[idxS] = bestBenchDef;
                remainingOutfield[idxB] = worstStarter;
            }
        }
    }

    // Re-check fwd count (min 1)
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
    // Logic: Prioritize "Safe" players for Captain/Vice-Captain
    // "Safe" = Played >= 75% of available minutes
    // We infer available minutes from the current gameweek
    const nextGW = fixtures[0]?.event || 1;
    const weeksPassed = Math.max(0, nextGW - 1);

    const isSafeCaptain = (p: PlayerWithXP) => {
        // Early season: not enough data to judge rotation risk by minutes strictly
        if (weeksPassed < 5) return true;

        // Check for specific injury flag first (if < 75% chance, definitely unsafe)
        if (p.chance_of_playing_next_round !== undefined && p.chance_of_playing_next_round !== null && p.chance_of_playing_next_round < 75) return false;

        // Minutes check
        const totalMinutesPossible = weeksPassed * 90;
        const playedRatio = p.minutes / Math.max(90, totalMinutesPossible);

        return playedRatio >= 0.75;
    };

    const sortedStarters = [...starters].sort((a, b) => b.xP - a.xP);

    // Find best Captain
    let captain = sortedStarters.find(p => isSafeCaptain(p));
    // Fallback: If no safe captain found, take highest xP
    if (!captain) captain = sortedStarters[0];

    // Find best VC (excluding captain)
    const remainingForVC = sortedStarters.filter(p => p.id !== captain!.id);
    let viceCaptain = remainingForVC.find(p => isSafeCaptain(p));
    // Fallback
    if (!viceCaptain) viceCaptain = remainingForVC[0];

    // Calculate formation string (not returned by OptimizedTeam, but useful for debugging/internal logic)
    // const finalDef = starters.filter(p => p.element_type === 2).length;
    // const finalMid = starters.filter(p => p.element_type === 3).length;
    // const finalFwd = starters.filter(p => p.element_type === 4).length;

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
 * @param chipType - Optional chip type ('freehit', 'wildcard', 'bestteam') to influence optimization strategy
 * @returns OptimizedTeam with 100.0m budget
 */
export function createBestTeam(
    allPlayers: Player[],
    fixtures: Fixture[],
    gameweeks: number = 1,
    historicalData: HistoricalSeasonData[] = [],
    excludePlayers: number[] = [],
    includePlayers: number[] = [],
    strategy?: OptimizationStrategy,
    chipType?: 'freehit' | 'wildcard' | 'bestteam'
): OptimizedTeam {
    const settings: OptimizationSettings = {
        budget: 100.0,
        gameweeks,
        excludePlayers,
        includePlayers,
        historicalData,
        strategy,
        chipType
    };

    return optimizeTeam(allPlayers, fixtures, settings);
}

/**
 * Optimize lineup for a given 15-player squad
 * Determines best starting XI, bench order, and captaincy for next gameweek
 * 
 * @param squadPlayers - Array of exactly 15 players in the squad
 * @param fixtures - Array of upcoming fixtures
 * @param historicalData - Optional historical season data
 * @param strategy - Optional strategy settings
 * @returns LineupOptimization with optimal starting XI and bench
 */
export function optimizeLineup(
    squadPlayers: Player[],
    fixtures: Fixture[],
    historicalData: HistoricalSeasonData[] = [],
    strategy?: OptimizationStrategy
): LineupOptimization {
    if (squadPlayers.length !== 15) {
        throw new Error(`Squad must have exactly 15 players, got ${squadPlayers.length}`);
    }

    // Calculate xP for all squad players (1 gameweek only)
    const playersWithXP: PlayerWithXP[] = squadPlayers.map(p => {
        const { totalXP, breakdown } = calculateExpectedPoints(
            p,
            fixtures,
            1, // Next gameweek only
            historicalData,
            strategy
        );
        return {
            ...p,
            xP: totalXP,
            xpBreakdown: breakdown
        };
    });

    // Separate goalkeepers and outfield players
    const gks = playersWithXP.filter(p => p.element_type === 1).sort((a, b) => b.xP - a.xP);
    const outfield = playersWithXP.filter(p => p.element_type !== 1);

    if (gks.length !== 2) {
        throw new Error(`Squad must have exactly 2 goalkeepers, got ${gks.length}`);
    }

    // Valid formations: [DEF, MID, FWD]
    const validFormations = [
        [3, 4, 3],
        [3, 5, 2],
        [4, 3, 3],
        [4, 4, 2],
        [4, 5, 1],
        [5, 3, 2],
        [5, 4, 1],
    ];

    let bestFormation: { def: number; mid: number; fwd: number } | null = null;
    let bestStarters: PlayerWithXP[] = [];
    let bestTotalXP = -1;

    // Try each formation
    for (const [defCount, midCount, fwdCount] of validFormations) {
        const defenders = outfield.filter(p => p.element_type === 2).sort((a, b) => b.xP - a.xP);
        const midfielders = outfield.filter(p => p.element_type === 3).sort((a, b) => b.xP - a.xP);
        const forwards = outfield.filter(p => p.element_type === 4).sort((a, b) => b.xP - a.xP);

        // Check if we have enough players for this formation
        if (defenders.length < defCount || midfielders.length < midCount || forwards.length < fwdCount) {
            continue;
        }

        // Select top players for this formation
        const selectedDef = defenders.slice(0, defCount);
        const selectedMid = midfielders.slice(0, midCount);
        const selectedFwd = forwards.slice(0, fwdCount);

        const formationStarters = [...selectedDef, ...selectedMid, ...selectedFwd];
        const totalXP = formationStarters.reduce((sum, p) => sum + p.xP, 0);

        if (totalXP > bestTotalXP) {
            bestTotalXP = totalXP;
            bestStarters = formationStarters;
            bestFormation = { def: defCount, mid: midCount, fwd: fwdCount };
        }
    }

    if (!bestFormation || bestStarters.length === 0) {
        throw new Error('Could not find valid formation for squad');
    }

    // Starting GK is the one with higher xP
    const startingGK = gks[0];
    const benchGK = gks[1];

    // Complete starters list
    const starters = [startingGK, ...bestStarters];

    // Bench: GK first, then remaining outfield players sorted by xP (descending for auto-sub priority)
    const benchOutfield = outfield
        .filter(p => !bestStarters.find(s => s.id === p.id))
        .sort((a, b) => b.xP - a.xP);

    const bench = [benchGK, ...benchOutfield];

    // Captain and vice-captain: highest and second-highest xP among starters
    // Logic: Prioritize "Safe" players for Captain/Vice-Captain
    // "Safe" = Played >= 75% of available minutes
    const nextGW = fixtures[0]?.event || 1;
    const weeksPassed = Math.max(0, nextGW - 1);

    const isSafeCaptain = (p: PlayerWithXP) => {
        if (weeksPassed < 5) return true;
        if (p.chance_of_playing_next_round !== undefined && p.chance_of_playing_next_round !== null && p.chance_of_playing_next_round < 75) return false;

        const totalMinutesPossible = weeksPassed * 90;
        const playedRatio = p.minutes / Math.max(90, totalMinutesPossible);
        return playedRatio >= 0.75;
    };

    const sortedStarters = [...starters].sort((a, b) => b.xP - a.xP);

    let captain = sortedStarters.find(p => isSafeCaptain(p));
    if (!captain) captain = sortedStarters[0];

    const remainingForVC = sortedStarters.filter(p => p.id !== captain!.id);
    let viceCaptain = remainingForVC.find(p => isSafeCaptain(p));
    if (!viceCaptain) viceCaptain = remainingForVC[0];

    const formationString = `${bestFormation.def}-${bestFormation.mid}-${bestFormation.fwd}`;
    const totalExpectedPoints = starters.reduce((sum, p) => sum + p.xP, 0) + captain.xP; // Captain gets double

    return {
        starters,
        bench,
        captain,
        viceCaptain,
        formation: formationString,
        totalExpectedPoints
    };
}
