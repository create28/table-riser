
import { Player, Fixture } from './fpl-api';

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

export function getTransferOutCandidates(players: Player[], fixtures: Fixture[]): TransferCandidate[] {
    return players
        .map(p => calculateTransferOutScore(p, fixtures))
        .sort((a, b) => b.score - a.score);
}

export function getTransferInCandidates(
    players: Player[],
    fixtures: Fixture[],
    position: number,
    budget: number,
    playerHistories?: { [key: number]: any },
    avoidRotationRisk: boolean = false
): TransferCandidate[] {
    return players
        .filter(p => p.element_type === position && p.now_cost <= budget && p.minutes >= 300)
        .map(p => calculateTransferInScore(p, fixtures, playerHistories, avoidRotationRisk))
        .sort((a, b) => b.score - a.score);
}

function calculateTransferOutScore(player: Player, fixtures: Fixture[]): TransferCandidate {
    let score = 0;
    const reasons: string[] = [];
    const breakdown = { form: 0, fixtures: 0, value: 0, ict: 0, xg: 0, trends: 0 };

    // 1. Form (Recent performance)
    const form = parseFloat(player.form);
    if (form < 3.0) {
        score += 20;
        breakdown.form += 20;
        reasons.push(`Poor form (${form})`);
    } else if (form < 4.0) {
        score += 10;
        breakdown.form += 10;
        reasons.push('Below average form');
    }

    // 2. Value Efficiency (Points per million)
    const pointsPerMillion = player.total_points > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    if (pointsPerMillion < 12) {
        score += 15;
        breakdown.value += 15;
        reasons.push('Poor value for money');
    }

    // 3. Fixture Difficulty (Next 5)
    const upcomingFixtures = getUpcomingFixtures(player, fixtures);
    const avgDifficulty = calculateAvgDifficulty(upcomingFixtures, player);

    if (avgDifficulty >= 4) {
        score += 15;
        breakdown.fixtures += 15;
        reasons.push('Very tough fixtures ahead');
    } else if (avgDifficulty >= 3.5) {
        score += 8;
        breakdown.fixtures += 8;
        reasons.push('Difficult fixtures');
    }

    // 4. Injury / Availability
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

    // 5. Market Trends (Transfers Out)
    const transfersOut = player.transfers_out_event;
    if (transfersOut > 50000) {
        score += 10;
        breakdown.trends += 10;
        reasons.push('High transfers out');
    }

    // 6. xG/xA Underperformance (if available)
    if (player.expected_goal_involvements) {
        const xGI = parseFloat(player.expected_goal_involvements);
        const actualGI = player.goals_scored + player.assists;
        if (xGI > actualGI + 2) {
            // Actually this might mean they are unlucky, but for transfer OUT we usually look for overperformance reverting to mean
            // or just bad players. Let's stick to simple metrics for now.
        }
    }

    return { player, score, reasons, breakdown };
}

function calculateTransferInScore(
    player: Player,
    fixtures: Fixture[],
    playerHistories?: { [key: number]: any },
    avoidRotationRisk: boolean = false
): TransferCandidate {
    let score = 0;
    const reasons: string[] = [];
    const breakdown = { form: 0, fixtures: 0, value: 0, ict: 0, xg: 0, trends: 0 };

    // 1. Form (Weighted heavily)
    const form = parseFloat(player.form);
    if (form >= 6.0) {
        score += 30;
        breakdown.form += 30;
        reasons.push(`Excellent form (${form})`);
    } else if (form >= 5.0) {
        score += 20;
        breakdown.form += 20;
        reasons.push('Great form');
    } else if (form >= 4.0) {
        score += 10;
        breakdown.form += 10;
        reasons.push('Good form');
    }

    // 2. Fixture Difficulty (Next 5)
    const upcomingFixtures = getUpcomingFixtures(player, fixtures);
    const avgDifficulty = calculateAvgDifficulty(upcomingFixtures, player);

    if (avgDifficulty <= 2.5) {
        score += 25;
        breakdown.fixtures += 25;
        reasons.push('Very easy fixtures');
    } else if (avgDifficulty <= 3.0) {
        score += 15;
        breakdown.fixtures += 15;
        reasons.push('Favorable fixtures');
    }

    // 3. Value Efficiency
    const pointsPerMillion = player.total_points > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    if (pointsPerMillion >= 25) {
        score += 15;
        breakdown.value += 15;
        reasons.push('Great value');
    } else if (pointsPerMillion >= 20) {
        score += 10;
        breakdown.value += 10;
        reasons.push('Good value');
    }

    // 4. Underlying Stats (ICT & xG/xA)
    const ict = parseFloat(player.ict_index);
    if (ict > 100) { // High ICT usually means good underlying stats
        score += 10;
        breakdown.ict += 10;
        reasons.push('Strong underlying stats');
    }

    if (player.expected_goal_involvements) {
        const xGI = parseFloat(player.expected_goal_involvements);
        if (xGI > 5.0) {
            score += 15;
            breakdown.xg += 15;
            reasons.push(`High xGI (${xGI})`);
        } else if (xGI > 3.0) {
            score += 8;
            breakdown.xg += 8;
        }
    }

    // 5. Market Trends (Transfers In)
    const transfersIn = player.transfers_in_event;
    if (transfersIn > 100000) {
        score += 15;
        breakdown.trends += 15;
        reasons.push('Highly requested');
    } else if (transfersIn > 50000) {
        score += 8;
        breakdown.trends += 8;
        reasons.push('Popular transfer');
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

function calculateAvgDifficulty(fixtures: Fixture[], player: Player) {
    return fixtures.reduce((sum, fixture) => {
        const isHome = fixture.team_h === player.team;
        return sum + (isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty);
    }, 0) / (fixtures.length || 1);
}
