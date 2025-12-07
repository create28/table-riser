
import { Player, Fixture } from './fpl-api';
import { AlgorithmWeights, DEFAULT_WEIGHTS } from './ml-learning-engine';

export interface TransferCandidate {
    player: Player;
    score: number;
    reasons: string[];
    breakdown: {
        form: number;
        fixtures: number;
        value: number;
        ict: number;
        xg: number;
        trends: number;
    };
}

export function getBestTransfer(
    currentPlayers: Player[],
    allPlayers: Player[],
    fixtures: Fixture[],
    bank: number = 0
): { transferOut: Player; transferIn: Player; score: number } | null {
    // 1. Find best candidate to transfer OUT
    const transferOutCandidates = getTransferOutCandidates(currentPlayers, fixtures);

    if (transferOutCandidates.length === 0 || transferOutCandidates[0].score <= 0) {
        return null;
    }

    const bestTransferOut = transferOutCandidates[0].player;
    const budget = (bestTransferOut.now_cost + bank);

    // 2. Find best candidate to transfer IN (same position)
    const currentPlayerIds = new Set(currentPlayers.map(p => p.id));
    const availablePlayers = allPlayers.filter(p => !currentPlayerIds.has(p.id));

    const transferInCandidates = getTransferInCandidates(availablePlayers, fixtures, bestTransferOut.element_type, budget);

    if (transferInCandidates.length === 0) {
        return null;
    }

    const bestTransferIn = transferInCandidates[0].player;

    return {
        transferOut: bestTransferOut,
        transferIn: bestTransferIn,
        score: transferInCandidates[0].score + transferOutCandidates[0].score
    };
}

export function getTransferOutCandidates(players: Player[], fixtures: Fixture[], weights?: AlgorithmWeights): TransferCandidate[] {
    return players
        .map(p => calculateTransferOutScore(p, fixtures, weights))
        .sort((a, b) => b.score - a.score);
}

export function getTransferInCandidates(
    players: Player[],
    fixtures: Fixture[],
    position: number,
    budget: number,
    playerHistories?: { [key: number]: any },
    avoidRotationRisk: boolean = false,
    weights?: AlgorithmWeights
): TransferCandidate[] {
    return players
        .filter(p => p.element_type === position && p.now_cost <= budget && p.minutes >= 300)
        .map(p => calculateTransferInScore(p, fixtures, playerHistories, avoidRotationRisk, weights))
        .sort((a, b) => b.score - a.score);
}

function calculateTransferOutScore(player: Player, fixtures: Fixture[], weights: AlgorithmWeights = DEFAULT_WEIGHTS): TransferCandidate {
    let score = 0;
    const reasons: string[] = [];
    const breakdown = { form: 0, fixtures: 0, value: 0, ict: 0, xg: 0, trends: 0, custom: {} };

    // Multipliers based on ML weights (relative to default)
    // If model learns form is more important (e.g. 0.8 vs 0.5), we boost form score by 1.6x
    const wForm = weights.formWeight / DEFAULT_WEIGHTS.formWeight;
    const wFixtures = weights.fixtureWeight / DEFAULT_WEIGHTS.fixtureWeight;
    const wValue = weights.priceWeight / DEFAULT_WEIGHTS.priceWeight;
    // ICT and xG share the ictWeight for now as "stats"
    const wStats = weights.ictWeight / DEFAULT_WEIGHTS.ictWeight;

    // 1. Form (Recent performance)
    const form = parseFloat(player.form);
    if (form < 3.0) {
        const pts = 20 * wForm;
        score += pts;
        breakdown.form += pts;
        reasons.push(`Poor form (${form})`);
    } else if (form < 4.0) {
        const pts = 10 * wForm;
        score += pts;
        breakdown.form += pts;
        reasons.push('Below average form');
    }

    // 2. Value Efficiency (Points per million)
    const pointsPerMillion = player.total_points > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    if (pointsPerMillion < 12) {
        const pts = 15 * wValue;
        score += pts;
        breakdown.value += pts;
        reasons.push('Poor value for money');
    }

    // 3. Fixture Difficulty (Next 5)
    const upcomingFixtures = getUpcomingFixtures(player, fixtures);
    const avgDifficulty = calculateAvgDifficulty(upcomingFixtures, player);

    if (avgDifficulty >= 4) {
        const pts = 15 * wFixtures;
        score += pts;
        breakdown.fixtures += pts;
        reasons.push('Very tough fixtures ahead');
    } else if (avgDifficulty >= 3.5) {
        const pts = 8 * wFixtures;
        score += pts;
        breakdown.fixtures += pts;
        reasons.push('Difficult fixtures');
    }

    // 4. Injury / Availability (NOT WEIGHTED - Fundamental Constraint)
    if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined && player.chance_of_playing_next_round < 100) {
        if (player.chance_of_playing_next_round === 0) {
            score += 50;
            reasons.push(`Unavailable: ${player.news || 'Injured/Suspended'}`);
        } else if (player.chance_of_playing_next_round <= 50) {
            score += 25;
            reasons.push(`Doubtful (${player.chance_of_playing_next_round}%): ${player.news}`);
        } else if (player.chance_of_playing_next_round <= 75) {
            score += 10;
            reasons.push(`Slight doubt (${player.chance_of_playing_next_round}%)`);
        }
    }

    // 5. Market Trends (Transfers Out) - Partially form/popularity
    const transfersOut = player.transfers_out_event;
    if (transfersOut > 50000) {
        const pts = 10 * wForm; // Trends often correlate with form
        score += pts;
        breakdown.trends += pts;
        reasons.push('High transfers out');
    }

    // 6. xG/xA Underperformance (if available) - Removed as per instruction, was commented out.

    return { player, score, reasons, breakdown };
}

function calculateTransferInScore(
    player: Player,
    fixtures: Fixture[],
    playerHistories?: { [key: number]: any },
    avoidRotationRisk: boolean = false,
    weights: AlgorithmWeights = DEFAULT_WEIGHTS
): TransferCandidate {
    let score = 0;
    const reasons: string[] = [];
    const breakdown = { form: 0, fixtures: 0, value: 0, ict: 0, xg: 0, trends: 0, custom: {} };

    const wForm = weights.formWeight / DEFAULT_WEIGHTS.formWeight;
    const wFixtures = weights.fixtureWeight / DEFAULT_WEIGHTS.fixtureWeight;
    const wValue = weights.priceWeight / DEFAULT_WEIGHTS.priceWeight;
    const wStats = weights.ictWeight / DEFAULT_WEIGHTS.ictWeight;

    // 1. Form (Weighted heavily)
    const form = parseFloat(player.form);
    if (form >= 6.0) {
        const pts = 30 * wForm;
        score += pts;
        breakdown.form += pts;
        reasons.push(`Excellent form (${form})`);
    } else if (form >= 5.0) {
        const pts = 20 * wForm;
        score += pts;
        breakdown.form += pts;
        reasons.push(`Strong form (${form})`);
    } else if (form >= 3.5) {
        const pts = 10 * wForm;
        score += pts;
        breakdown.form += pts;
    }

    // 2. Fixtures (Next 5)
    const upcomingFixtures = getUpcomingFixtures(player, fixtures);
    const avgDifficulty = calculateAvgDifficulty(upcomingFixtures, player);

    if (avgDifficulty <= 2.2) {
        const pts = 25 * wFixtures;
        score += pts;
        breakdown.fixtures += pts;
        reasons.push('Great run of fixtures');
    } else if (avgDifficulty <= 2.8) {
        const pts = 15 * wFixtures;
        score += pts;
        breakdown.fixtures += pts;
        reasons.push('Good fixtures');
    }

    // 3. Value
    const pointsPerMillion = player.total_points > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    if (pointsPerMillion > 15) {
        const pts = 10 * wValue;
        score += pts;
        breakdown.value += pts;
        reasons.push('High value');
    }

    // 4. Underlying Stats (ICT / xG / xA)
    const ictIndex = parseFloat(player.ict_index);
    if (ictIndex > 100) {
        const pts = 15 * wStats;
        score += pts;
        breakdown.ict += pts;
        reasons.push('Elite underlying stats');
    } else if (ictIndex > 70) {
        const pts = 8 * wStats;
        score += pts;
        breakdown.ict += pts;
    }

    // xG/xA Boost
    if (player.expected_goal_involvements) {
        const xGI = parseFloat(player.expected_goal_involvements);
        if (xGI > 5.0) {
            const pts = 10 * wStats;
            score += pts;
            breakdown.xg += pts;
            reasons.push('High xGI');
        }
    }

    // 6. Rotation Risk Check
    if (avoidRotationRisk && playerHistories && playerHistories[player.id]) {
        const history = playerHistories[player.id];
        if (history.history && history.history.length > 0) {
            // Get last 5 gameweeks
            const recentGames = history.history.slice(-5);

            // Calculate how many games they started (>60 mins)
            const gamesStarted = recentGames.filter((g: any) => g.minutes >= 60).length;
            const startPercentage = (gamesStarted / recentGames.length) * 100;

            // If they don't start consistently, penalize
            if (startPercentage < 80) {
                score -= 20;
                reasons.push(`Rotation risk (${startPercentage.toFixed(0)}% starts)`);
            }
        }
    }

    // 7. Injury Check (Hard Filter/Penalty)
    if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined && player.chance_of_playing_next_round < 75) {
        score = -100; // Do not recommend
        reasons.push('Injury risk');
    }
    if (player.news && (player.news.toLowerCase().includes('suspended') || player.news.toLowerCase().includes('injury'))) {
        if (player.chance_of_playing_next_round === null) {
            score = -100;
            reasons.push('Suspended/Injured');
        }
    }

    return { player, score, reasons, breakdown };
}

// Helpers
function getUpcomingFixtures(player: Player, fixtures: Fixture[]) {
    return fixtures
        .filter(f => (f.team_h === player.team || f.team_a === player.team) && !f.finished)
        .sort((a, b) => a.event - b.event)
        .slice(0, 5);
}

// Double Transfer Recommendation
export interface DoubleTransferRecommendation {
    out1: Player;
    out2: Player;
    in1: Player;
    in2: Player;
    totalScore: number;
    scoreGain: number;
    netCost: number;
}

export function getDoubleTransferRecommendations(
    currentPlayers: Player[],
    allPlayers: Player[],
    fixtures: Fixture[],
    bank: number = 0,
    topN: number = 5
): DoubleTransferRecommendation[] {
    const recommendations: DoubleTransferRecommendation[] = [];

    // 1. Identify valid candidates to sell (Low projected points or high value tied up)
    const possibleOuts = getTransferOutCandidates(currentPlayers, fixtures)
        .slice(0, 8) // Limit to top 8 sell candidates to reduce complexity
        .map(c => c.player);

    if (possibleOuts.length < 2) return [];

    // 2. Identify top targets to buy (High projected points)
    // Pre-calculate top score candidates for each position to avoid re-scanning
    const topTargetsByPos: { [pos: number]: Player[] } = {};
    [1, 2, 3, 4].forEach(pos => {
        // Get top 20 unconditional targets (ignoring budget strictly for now)
        topTargetsByPos[pos] = getTransferInCandidates(allPlayers, fixtures, pos, 2000)
            .slice(0, 20)
            .map(c => c.player);
    });

    // 3. Iterate pairs of OUTs
    for (let i = 0; i < possibleOuts.length; i++) {
        for (let j = i + 1; j < possibleOuts.length; j++) {
            const out1 = possibleOuts[i];
            const out2 = possibleOuts[j];
            const combinedBudget = out1.now_cost + out2.now_cost + bank;

            // Target Positions must match Out Positions (Simplification: Direct swaps)
            // Case A: Same positions (e.g. DEF+DEF -> DEF+DEF)
            // Case B: Swapped (unlikely if positions differ, usually strictly mapped)
            // In FPL transfers are 1-1 by position slot mostly, so we assume In1 matches Out1 pos, In2 matches Out2 pos.

            const targets1 = topTargetsByPos[out1.element_type];
            const targets2 = topTargetsByPos[out2.element_type];

            // Iterate pairs of INs
            // To be efficient: Sort targets by score. We want max(Score1 + Score2) s.t. Cost1 + Cost2 <= Budget

            for (const in1 of targets1) {
                // Optimization: If In1 alone exceeds budget, skip (unless In2 is negative cost... impossible)
                if (in1.now_cost >= combinedBudget - 38) continue; // Min price is ~3.8m

                // Find best in2 that fits remaining budget
                const remainingBudget = combinedBudget - in1.now_cost;

                // Find best In2
                const bestIn2 = targets2.find(p => p.id !== in1.id && p.now_cost <= remainingBudget); // Ensure distinct if same pos

                if (bestIn2) {
                    // Calculate scores
                    const outScore = (calculateTransferOutScore(out1, fixtures).score + calculateTransferOutScore(out2, fixtures).score);
                    const inScore = (calculateTransferInScore(in1, fixtures).score + calculateTransferInScore(bestIn2, fixtures).score);

                    // Net Improvement
                    const scoreGain = inScore + outScore; // Note: OutScore is positive if they are "bad", so Selling Bad + Buying Good = High Gain

                    recommendations.push({
                        out1, out2, in1, in2: bestIn2,
                        totalScore: inScore,
                        scoreGain,
                        netCost: (in1.now_cost + bestIn2.now_cost) - (out1.now_cost + out2.now_cost)
                    });
                }
            }
        }
    }

    // Sort by gain and distinct
    return recommendations
        .sort((a, b) => b.scoreGain - a.scoreGain)
        .slice(0, topN);
}

// Unified Recommendation System
export type RecommendationType = 'single' | 'double';

export interface StrategicMove {
    type: RecommendationType;
    playersOut: Player[];
    playersIn: Player[];
    scoreGain: number;       // Raw points gain
    transferCost: number;    // Points cost (hits)
    netScore: number;        // Gain - Cost
    netBudget: number;       // Positive = Savings, Negative = Cost
}

export function getTopStrategicMoves(
    currentPlayers: Player[],
    allPlayers: Player[],
    fixtures: Fixture[],
    bank: number,
    freeTransfers: number,
    topN: number = 10,
    weights?: AlgorithmWeights
): StrategicMove[] {
    const moves: StrategicMove[] = [];

    // 1. Single Transfers
    // Get best OUTs
    const outs = getTransferOutCandidates(currentPlayers, fixtures, weights).slice(0, 10);

    // Get best INs (pre-fetched top lists to optimize)
    const topTargetsByPos: { [pos: number]: Player[] } = {};
    [1, 2, 3, 4].forEach(pos => {
        // Budget is dynamic per move, so we just get the absolute best players generally
        topTargetsByPos[pos] = getTransferInCandidates(allPlayers, fixtures, pos, 2000, undefined, false, weights)
            .slice(0, 20)
            .map(c => c.player);
    });

    outs.forEach(outCand => {
        const out = outCand.player;
        const budget = out.now_cost + bank;
        const targets = topTargetsByPos[out.element_type].filter(t => t.now_cost <= budget && t.id !== out.id);

        // Take top 3 suitable replacements per OUT to avoid spamming
        targets.slice(0, 3).forEach(inPlayer => {
            const outScore = outCand.score; // Higher is "worse" for player, so selling them is good. We treat this as "Points gained by removing bad player"
            const inCand = calculateTransferInScore(inPlayer, fixtures, undefined, false, weights); // Re-calc exact score

            // Note: Our scores are heuristic (0-100 scale), not strictly "Predicted Points". 
            // We sum them: Improvement = (InScore - avg) + (OutScore - avg). 
            // Heuristic: OutScore is "how bad they are". InScore is "how good they are".
            // Total Gain ~ InScore + OutScore.
            const rawGain = inCand.score + outScore;

            const cost = freeTransfers >= 1 ? 0 : 4;

            moves.push({
                type: 'single',
                playersOut: [out],
                playersIn: [inPlayer],
                scoreGain: rawGain,
                transferCost: cost,
                netScore: rawGain - (cost * 5), // Weight hit cost x5 because heuristics are 0-100 scale, but hits are real points.
                netBudget: out.now_cost - inPlayer.now_cost
            });
        });
    });


    // 2. Double Transfers
    const doubleRecs = getDoubleTransferRecommendations(currentPlayers, allPlayers, fixtures, bank, 10);
    doubleRecs.forEach(rec => {
        const cost = Math.max(0, 2 - freeTransfers) * 4;

        moves.push({
            type: 'double',
            playersOut: [rec.out1, rec.out2],
            playersIn: [rec.in1, rec.in2],
            scoreGain: rec.scoreGain,
            transferCost: cost,
            netScore: rec.scoreGain - (cost * 5), // Weight hits same as above
            netBudget: rec.netCost * -1 // netCost in Rec is (In - Out), so negative of that is budget change (Savings)
        });
    });

    // Sort by Net Score
    return moves.sort((a, b) => b.netScore - a.netScore).slice(0, topN);
}

function calculateAvgDifficulty(fixtures: Fixture[], player: Player) {
    return fixtures.reduce((sum, fixture) => {
        const isHome = fixture.team_h === player.team;
        return sum + (isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty);
    }, 0) / (fixtures.length || 1);
}
