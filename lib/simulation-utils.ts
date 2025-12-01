import { Player, Team, Fixture } from './fpl-api';
import { AlgorithmWeights } from './ml-learning-engine';

export interface SimulationScenario {
    gameweek: number;
    team: Player[]; // The "user's" team (subset of players)
    market: Player[]; // Potential transfer targets
    budget: number;
}

export interface SimulationResult {
    transferIn: Player | null;
    transferOut: Player | null;
    predictedPoints: number;
    actualPoints: number;
    pointsDiff: number;
    success: boolean;
}

/**
 * Reconstructs a player's state (form, price, total points) as it was before the target gameweek.
 */
export function reconstructPlayerState(
    player: Player,
    history: any,
    targetGameweek: number
): Player {
    if (!history || !history.history) return player;

    const pastGames = history.history.filter((g: any) => g.round < targetGameweek);

    // 1. Calculate Total Points up to target GW
    const totalPoints = pastGames.reduce((sum: number, g: any) => sum + g.total_points, 0);

    // 2. Calculate Form (Average of last 4 gameweeks)
    // FPL uses last 30 days, but last 4 GWs is a decent approximation for simulation
    const last4Games = pastGames.slice(-4);
    const formPoints = last4Games.reduce((sum: number, g: any) => sum + g.total_points, 0);
    const form = last4Games.length > 0 ? (formPoints / last4Games.length).toFixed(1) : "0.0";

    // 3. Calculate Season PPG
    const ppg = pastGames.length > 0 ? (totalPoints / pastGames.length).toFixed(1) : "0.0";

    // 4. Get Cost at target GW
    // The history item for the *previous* gameweek contains the value at that time
    const lastGame = pastGames[pastGames.length - 1];
    const nowCost = lastGame ? lastGame.value : player.now_cost;

    return {
        ...player,
        total_points: totalPoints,
        form: form,
        points_per_game: ppg,
        now_cost: nowCost,
        // We can't easily reconstruct ICT index without detailed stats, so we keep current or estimate
        // For V1, we'll use current ICT as a proxy, or scale it by games played
        ict_index: player.ict_index // Keeping as is for simplicity in V1
    };
}

/**
 * Calculates the actual points scored by a player in the next N gameweeks.
 */
export function calculateActualPoints(
    history: any,
    startGameweek: number,
    duration: number = 3
): number {
    if (!history || !history.history) return 0;

    const futureGames = history.history.filter(
        (g: any) => g.round >= startGameweek && g.round < startGameweek + duration
    );

    return futureGames.reduce((sum: number, g: any) => sum + g.total_points, 0);
}

/**
 * Simulates a transfer decision using the given weights and historical data.
 */
export function runSimulation(
    scenario: SimulationScenario,
    weights: AlgorithmWeights,
    playerHistories: { [key: number]: any },
    fixtures: Fixture[]
): SimulationResult {
    const { gameweek, team, market, budget } = scenario;

    // 1. Reconstruct state for all players
    const teamState = team.map(p => reconstructPlayerState(p, playerHistories[p.id], gameweek));
    const marketState = market.map(p => reconstructPlayerState(p, playerHistories[p.id], gameweek));

    // 2. Find best transfer
    let bestTransferOut: Player | null = null;
    let bestTransferIn: Player | null = null;
    let maxScoreDiff = -Infinity;

    for (const pOut of teamState) {
        const outScore = calculateScore(pOut, weights, fixtures, gameweek);

        for (const pIn of marketState) {
            // Skip if already in team
            if (teamState.find(p => p.id === pIn.id)) continue;

            // Check budget
            if (pIn.now_cost > pOut.now_cost + budget) continue;

            // Check position (must match)
            if (pIn.element_type !== pOut.element_type) continue;

            const inScore = calculateScore(pIn, weights, fixtures, gameweek);
            const scoreDiff = inScore - outScore;

            if (scoreDiff > maxScoreDiff) {
                maxScoreDiff = scoreDiff;
                bestTransferOut = pOut;
                bestTransferIn = pIn;
            }
        }
    }

    if (!bestTransferOut || !bestTransferIn || maxScoreDiff < -2) {
        return {
            transferIn: null,
            transferOut: null,
            predictedPoints: 0,
            actualPoints: 0,
            pointsDiff: 0,
            success: false
        };
    }

    // 3. Evaluate Outcome
    const actualPointsOut = calculateActualPoints(playerHistories[bestTransferOut.id], gameweek, 3);
    const actualPointsIn = calculateActualPoints(playerHistories[bestTransferIn.id], gameweek, 3);
    const pointsDiff = actualPointsIn - actualPointsOut;

    return {
        transferIn: bestTransferIn,
        transferOut: bestTransferOut,
        predictedPoints: maxScoreDiff,
        actualPoints: actualPointsIn,
        pointsDiff: pointsDiff,
        success: pointsDiff > 0
    };
}

function calculateScore(player: Player, weights: AlgorithmWeights, fixtures: Fixture[], gameweek: number): number {
    // Normalize values roughly to 0-10 range
    const formScore = parseFloat(player.form); // 0-10
    const ictScore = parseFloat(player.ict_index) / 10; // 0-10 approx
    const priceScore = 10 - (player.now_cost / 15);

    // Calculate Fixture Difficulty for next 3 GWs
    let fixtureScore = 0;
    const nextFixtures = fixtures.filter(f =>
        f.event >= gameweek &&
        f.event < gameweek + 3 &&
        (f.team_h === player.team || f.team_a === player.team)
    );

    if (nextFixtures.length > 0) {
        const totalDifficulty = nextFixtures.reduce((sum, f) => {
            const isHome = f.team_h === player.team;
            return sum + (isHome ? f.team_h_difficulty : f.team_a_difficulty);
        }, 0);
        const avgDifficulty = totalDifficulty / nextFixtures.length;
        fixtureScore = 5 - avgDifficulty; // 5 (Easy) to 0 (Hard)
    }

    return (
        formScore * weights.formWeight +
        ictScore * weights.ictWeight +
        priceScore * weights.priceWeight +
        fixtureScore * weights.fixtureWeight
    );
}
