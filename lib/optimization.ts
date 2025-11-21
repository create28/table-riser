import { Player, Team, Fixture } from './fpl-api';
import { HistoricalSeasonData, findHistoricalMatches } from './historical-data';

export interface OptimizationSettings {
    budget: number;
    gameweeks: number; // 1 for Free Hit, >1 for Wildcard
    excludePlayers: number[];
    includePlayers: number[];
    historicalData: HistoricalSeasonData[];
}

export interface PlayerWithXP extends Player {
    xP: number;
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
    historicalData: HistoricalSeasonData[] = []
): number {
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

    // Weighted Base Points
    // If we have historical data, use it to stabilize the prediction
    let basePoints = 0;

    if (historicalMatchesCount > 10) {
        // Player has history: Balance recent form, season form, and history
        // 35% Recent, 35% Season, 30% History
        basePoints = (recentForm * 0.35) + (seasonPPG * 0.35) + (historicalPPG * 0.30);

        // Consistency Bonus: If historical PPG is high (> 4.5), boost slightly
        if (historicalPPG > 4.5) basePoints += 0.5;

    } else {
        // New player or lack of history: Rely on season form and recent form
        // 60% Recent, 40% Season (Form is more volatile but important for new players)
        basePoints = (recentForm * 0.6) + (seasonPPG * 0.4);
    }

    // If player has no minutes, return 0 (unless high chance of playing)
    if (player.minutes === 0 && player.chance_of_playing_next_round !== 100) return 0;

    // Check injury status
    if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined && player.chance_of_playing_next_round < 75) {
        return 0;
    }

    for (const fixture of upcomingFixtures) {
        const isHome = fixture.team_h === playerTeam;
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;

        // Difficulty multiplier (easier = higher multiplier)
        // Difficulty 1-5. 
        // 1 -> 1.2x
        // 2 -> 1.1x
        // 3 -> 1.0x
        // 4 -> 0.9x
        // 5 -> 0.8x
        const difficultyMultiplier = 1.3 - (difficulty * 0.1);

        // Home advantage multiplier
        const homeMultiplier = isHome ? 1.1 : 0.95;

        let matchXP = basePoints * difficultyMultiplier * homeMultiplier;

        // Position specific adjustments
        if (player.element_type === 1 || player.element_type === 2) { // GK or DEF
            // Clean sheet probability proxy based on difficulty
            if (difficulty <= 2) matchXP += 2; // High CS chance
        } else if (player.element_type === 3) { // MID
            if (difficulty <= 2) matchXP += 1;
        } else if (player.element_type === 4) { // FWD
            if (difficulty <= 2) matchXP += 1.5;
        }

        totalXP += matchXP;
    }

    return totalXP;
}

// Greedy optimization algorithm
export function optimizeTeam(
    allPlayers: Player[],
    fixtures: Fixture[],
    settings: OptimizationSettings
): OptimizedTeam {
    // 1. Calculate xP for all players
    const playersWithXP: PlayerWithXP[] = allPlayers.map(p => ({
        ...p,
        xP: calculateExpectedPoints(p, fixtures, settings.gameweeks, settings.historicalData)
    })).filter(p => p.xP > 0); // Remove players with 0 xP

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
    for (const player of playersWithXP) {
        if (selectedPlayers.find(p => p.id === player.id)) continue; // Already selected
        if (settings.excludePlayers.includes(player.id)) continue; // Excluded

        const type = player.element_type as keyof typeof currentCounts;
        if (currentCounts[type] < requirements[type] && canAddPlayer(player)) {
            selectedPlayers.push(player);
            teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
            currentCost += player.now_cost;
            currentCounts[type]++;
        }

        if (selectedPlayers.length === 15) break;
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
