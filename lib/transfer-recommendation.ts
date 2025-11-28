
import { Player, Fixture } from './fpl-api';

interface TransferCandidate {
    player: Player;
    score: number;
}

export function getBestTransfer(
    currentPlayers: Player[],
    allPlayers: Player[],
    fixtures: Fixture[]
): { transferOut: Player; transferIn: Player } | null {
    // 1. Find best candidate to transfer OUT
    const transferOutCandidates = currentPlayers
        .map(p => ({ player: p, score: calculateTransferOutScore(p, fixtures) }))
        .sort((a, b) => b.score - a.score);

    if (transferOutCandidates.length === 0 || transferOutCandidates[0].score <= 0) {
        return null;
    }

    const bestTransferOut = transferOutCandidates[0].player;

    // 2. Find best candidate to transfer IN (same position)
    const currentPlayerIds = new Set(currentPlayers.map(p => p.id));
    const availablePlayers = allPlayers.filter(p => !currentPlayerIds.has(p.id));

    const transferInCandidates = availablePlayers
        .filter(p => p.element_type === bestTransferOut.element_type && p.minutes >= 300) // Same pos, decent minutes
        .map(p => ({ player: p, score: calculateTransferInScore(p, fixtures) }))
        .sort((a, b) => b.score - a.score);

    if (transferInCandidates.length === 0) {
        return null;
    }

    const bestTransferIn = transferInCandidates[0].player;

    return {
        transferOut: bestTransferOut,
        transferIn: bestTransferIn
    };
}

function calculateTransferOutScore(player: Player, fixtures: Fixture[]): number {
    let score = 0;

    // Poor form
    const form = parseFloat(player.form);
    if (form < 3) score += 30;
    else if (form < 4) score += 15;

    // Poor value efficiency
    const pointsPerMillion = player.total_points > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    if (pointsPerMillion < 15) score += 25;
    else if (pointsPerMillion < 20) score += 10;

    // Low minutes
    if (player.minutes < 300) score += 20;
    else if (player.minutes < 500) score += 10;

    // High transfer out pressure
    const transferOutCoefficient = (player.transfers_out_event / 1000) * (1 + parseFloat(player.selected_by_percent) / 100);
    if (transferOutCoefficient > 10) score += 20;

    // Difficult upcoming fixtures
    const upcomingFixtures = fixtures
        .filter(f => (f.team_h === player.team || f.team_a === player.team) && !f.finished)
        .sort((a, b) => a.event - b.event)
        .slice(0, 5);

    const avgDifficulty = upcomingFixtures.reduce((sum, fixture) => {
        const isHome = fixture.team_h === player.team;
        return sum + (isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty);
    }, 0) / (upcomingFixtures.length || 1);

    // Injury / Availability
    if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined && player.chance_of_playing_next_round < 100) {
        if (player.chance_of_playing_next_round === 0) {
            score += 50; // High priority to remove
        } else if (player.chance_of_playing_next_round <= 50) {
            score += 25;
        } else if (player.chance_of_playing_next_round <= 75) {
            score += 10;
        }
    }

    if (avgDifficulty >= 4) {
        score += 15;
    } else if (avgDifficulty >= 3.5) {
        // reasons.push('Difficult fixtures');
        score += 8;
    }
    return score;
}

function calculateTransferInScore(player: Player, fixtures: Fixture[]): number {
    let score = 0;

    // Avoid injured/suspended players
    if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined && player.chance_of_playing_next_round < 75) {
        return -100; // Do not recommend
    }
    if (player.news && (player.news.toLowerCase().includes('suspended') || player.news.toLowerCase().includes('injury'))) {
        if (player.chance_of_playing_next_round === null) return -100; // Avoid if news exists but no probability (likely new injury)
    }

    // Excellent form
    const form = parseFloat(player.form);
    if (form >= 6) score += 30;
    else if (form >= 5) score += 20;
    else if (form >= 4) score += 10;

    // Good value efficiency
    const pointsPerMillion = player.total_points > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    if (pointsPerMillion >= 30) score += 25;
    else if (pointsPerMillion >= 25) score += 15;
    else if (pointsPerMillion >= 20) score += 10;

    // High minutes
    if (player.minutes >= 900) score += 15;
    else if (player.minutes >= 600) score += 8;

    // High transfer in pressure
    const transferInCoefficient = (player.transfers_in_event / 1000) * (1 + parseFloat(player.selected_by_percent) / 100);
    if (transferInCoefficient > 15) score += 15;
    else if (transferInCoefficient > 8) score += 10;

    // Easy upcoming fixtures
    const upcomingFixtures = fixtures
        .filter(f => (f.team_h === player.team || f.team_a === player.team) && !f.finished)
        .sort((a, b) => a.event - b.event)
        .slice(0, 5);

    const avgDifficulty = upcomingFixtures.reduce((sum, fixture) => {
        const isHome = fixture.team_h === player.team;
        return sum + (isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty);
    }, 0) / (upcomingFixtures.length || 1);

    if (avgDifficulty <= 2.5) score += 20;
    else if (avgDifficulty <= 3) score += 12;

    // Points per game
    const ppg = parseFloat(player.points_per_game);
    if (ppg >= 6) score += 15;
    else if (ppg >= 5) score += 10;

    return score;
}
