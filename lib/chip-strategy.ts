import { BootstrapStatic, Fixture, Player, Team } from './fpl-api';

export interface ChipStrategy {
    chipName: string;
    status: 'available' | 'used' | 'unavailable';
    recommendedGameweek: number | null;
    reason: string;
    urgency: 'high' | 'medium' | 'low' | 'none';
}

export interface ChipSet {
    name: string;
    startGw: number;
    endGw: number;
    chips: ChipStrategy[];
}

export function getChipStrategy(
    currentGameweek: number,
    chipsUsed: string[],
    fixtures: Fixture[],
    allPlayers: Player[] = [],
    teams: Team[] = []
): ChipSet[] {
    // Define the two sets of chips for 2025/26 season
    // Set 1: GW1 - GW19
    // Set 2: GW20 - GW38

    const set1: ChipSet = {
        name: "First Half Season (GW1-19)",
        startGw: 1,
        endGw: 19,
        chips: []
    };

    const set2: ChipSet = {
        name: "Second Half Season (GW20-38)",
        startGw: 20,
        endGw: 38,
        chips: []
    };

    // Helper to check if a chip is used
    const isChipUsed = (chipName: string, set: 'set1' | 'set2') => {
        // In a real API, we'd check the specific time it was used.
        // For now, we'll assume if it's in the list, it's used.
        // However, since chips reset, we need to be careful.
        // If we are in Set 1, any used chip counts for Set 1.
        // If we are in Set 2, we need to know if it was used in Set 2.
        // This is a limitation of the current simple data model.
        // We will assume for now that `chipsUsed` contains chips used in the CURRENT set.
        return chipsUsed.includes(chipName);
    };

    // --- Analyze Set 1 ---
    if (currentGameweek <= 19) {
        // Wildcard
        set1.chips.push(analyzeChip(
            'wildcard',
            'Wildcard',
            currentGameweek,
            19,
            isChipUsed('wildcard', 'set1'),
            fixtures,
            allPlayers,
            teams
        ));

        // Triple Captain
        set1.chips.push(analyzeChip(
            '3xc',
            'Triple Captain',
            currentGameweek,
            19,
            isChipUsed('3xc', 'set1'),
            fixtures,
            allPlayers,
            teams
        ));

        // Bench Boost
        set1.chips.push(analyzeChip(
            'bboost',
            'Bench Boost',
            currentGameweek,
            19,
            isChipUsed('bboost', 'set1'),
            fixtures,
            allPlayers,
            teams
        ));

        // Free Hit
        set1.chips.push(analyzeChip(
            'freehit',
            'Free Hit',
            currentGameweek,
            19,
            isChipUsed('freehit', 'set1'),
            fixtures,
            allPlayers,
            teams
        ));

        // Mystery Chip (Set 1 Only)
        set1.chips.push(analyzeChip(
            'mystery',
            'Mystery Chip',
            currentGameweek,
            19,
            isChipUsed('mystery', 'set1'),
            fixtures,
            allPlayers,
            teams
        ));
    } else {
        // Set 1 is over
        set1.chips = [
            { chipName: 'Wildcard', status: 'unavailable', recommendedGameweek: null, reason: 'Deadline passed (GW19)', urgency: 'none' },
            { chipName: 'Triple Captain', status: 'unavailable', recommendedGameweek: null, reason: 'Deadline passed (GW19)', urgency: 'none' },
            { chipName: 'Bench Boost', status: 'unavailable', recommendedGameweek: null, reason: 'Deadline passed (GW19)', urgency: 'none' },
            { chipName: 'Free Hit', status: 'unavailable', recommendedGameweek: null, reason: 'Deadline passed (GW19)', urgency: 'none' },
            { chipName: 'Mystery Chip', status: 'unavailable', recommendedGameweek: null, reason: 'Deadline passed (GW19)', urgency: 'none' },
        ];
    }

    // --- Analyze Set 2 ---
    if (currentGameweek >= 20) {
        // Logic for Set 2 (similar to Set 1 but different deadline)
        set2.chips.push(analyzeChip('wildcard', 'Wildcard', currentGameweek, 38, isChipUsed('wildcard', 'set2'), fixtures, allPlayers, teams));
        set2.chips.push(analyzeChip('3xc', 'Triple Captain', currentGameweek, 38, isChipUsed('3xc', 'set2'), fixtures, allPlayers, teams));
        set2.chips.push(analyzeChip('bboost', 'Bench Boost', currentGameweek, 38, isChipUsed('bboost', 'set2'), fixtures, allPlayers, teams));
        set2.chips.push(analyzeChip('freehit', 'Free Hit', currentGameweek, 38, isChipUsed('freehit', 'set2'), fixtures, allPlayers, teams));
    } else {
        // Set 2 hasn't started
        set2.chips = [
            { chipName: 'Wildcard', status: 'unavailable', recommendedGameweek: null, reason: 'Available from GW20', urgency: 'none' },
            { chipName: 'Triple Captain', status: 'unavailable', recommendedGameweek: null, reason: 'Available from GW20', urgency: 'none' },
            { chipName: 'Bench Boost', status: 'unavailable', recommendedGameweek: null, reason: 'Available from GW20', urgency: 'none' },
            { chipName: 'Free Hit', status: 'unavailable', recommendedGameweek: null, reason: 'Available from GW20', urgency: 'none' },
        ];
    }

    return [set1, set2];
}

function analyzeChip(
    apiName: string,
    displayName: string,
    currentGw: number,
    deadlineGw: number,
    isUsed: boolean,
    fixtures: Fixture[],
    allPlayers: Player[],
    teams: Team[]
): ChipStrategy {
    if (isUsed) {
        return {
            chipName: displayName,
            status: 'used',
            recommendedGameweek: null,
            reason: 'Already used in this period',
            urgency: 'none'
        };
    }

    const weeksRemaining = deadlineGw - currentGw + 1;

    // Urgency Logic
    let urgency: 'high' | 'medium' | 'low' | 'none' = 'low';
    let reason = '';
    let recommendedGw: number | null = null;

    if (weeksRemaining <= 0) {
        return {
            chipName: displayName,
            status: 'unavailable',
            recommendedGameweek: null,
            reason: 'Deadline passed',
            urgency: 'none'
        };
    }

    if (weeksRemaining <= 3) {
        urgency = 'high';
        reason = `Must be used within next ${weeksRemaining} gameweeks!`;
    } else if (weeksRemaining <= 6) {
        urgency = 'medium';
        reason = 'Plan to use soon';
    }

    // Specific Chip Logic
    if (apiName === 'wildcard') {
        if (urgency === 'high') {
            recommendedGw = currentGw;
        } else if (teams.length > 0 && fixtures.length > 0) {
            const wcPeriod = findBestWildcardPeriod(fixtures, teams, currentGw, deadlineGw);
            if (wcPeriod) {
                recommendedGw = wcPeriod.gameweek;
                reason = wcPeriod.reason;
                urgency = 'medium';
            } else if (deadlineGw <= 19) {
                reason = "Use before GW19 expires. Target fixture swings.";
            } else {
                const estimatedGw = currentGw < 30 ? 30 : 35;
                reason = `Hold for fixture swing or DGW preparation (Est. GW${estimatedGw})`;
            }
        } else if (deadlineGw <= 19) {
            reason = "Use before GW19 expires. Target fixture swings.";
        }
    } else if (apiName === '3xc') {
        const dgw = findNextDoubleGameweek(currentGw, deadlineGw, fixtures);
        if (dgw) {
            recommendedGw = dgw;
            reason = `Target Double Gameweek ${dgw}`;
            if (dgw - currentGw <= 2) urgency = 'high';
        } else if (allPlayers.length > 0 && teams.length > 0 && fixtures.length > 0) {
            const tcOpp = findBestTripleCaptainWeek(allPlayers, fixtures, teams, currentGw, deadlineGw);
            if (tcOpp) {
                recommendedGw = tcOpp.gameweek;
                reason = `GW${tcOpp.gameweek}: ${tcOpp.player.web_name} vs ${tcOpp.opponentName} (Difficulty: ${tcOpp.difficulty}, Est. ${tcOpp.estimatedPoints.toFixed(1)} pts)`;
                urgency = tcOpp.gameweek - currentGw <= 3 ? 'medium' : 'low';
            } else if (deadlineGw <= 19) {
                reason = "Save for a mini-DGW or strong fixture before GW19";
            } else {
                const estimatedGw = currentGw < 34 ? 34 : 37;
                reason = `Save for a Double Gameweek (Likely GW${estimatedGw})`;
            }
        } else if (deadlineGw <= 19) {
            reason = "Save for a mini-DGW or strong fixture before GW19";
        }
    } else if (apiName === 'bboost') {
        const dgw = findNextDoubleGameweek(currentGw, deadlineGw, fixtures);
        if (dgw) {
            recommendedGw = dgw;
            reason = `Target Double Gameweek ${dgw} with strong bench`;
        } else if (teams.length > 0 && fixtures.length > 0) {
            const bbWeek = findBestBenchBoostWeek(fixtures, teams, currentGw, deadlineGw);
            if (bbWeek) {
                recommendedGw = bbWeek.gameweek;
                reason = `GW${bbWeek.gameweek}: ${bbWeek.reason}`;
                urgency = bbWeek.gameweek - currentGw <= 3 ? 'medium' : 'low';
            } else if (deadlineGw <= 19) {
                reason = "Save for a mini-DGW or strong bench week before GW19";
            } else {
                const estimatedGw = currentGw < 34 ? 34 : 37;
                reason = `Save for a Double Gameweek (Likely GW${estimatedGw})`;
            }
        } else if (deadlineGw <= 19) {
            reason = "Save for a mini-DGW or strong bench week before GW19";
        }
    } else if (apiName === 'freehit') {
        const bgw = findNextBlankGameweek(currentGw, deadlineGw, fixtures);
        if (bgw) {
            recommendedGw = bgw;
            reason = `Target Blank Gameweek ${bgw}`;
            if (bgw - currentGw <= 2) urgency = 'high';
        } else if (teams.length > 0 && fixtures.length > 0) {
            const fhWeek = findBestFreeHitWeek(fixtures, teams, currentGw, deadlineGw);
            if (fhWeek) {
                recommendedGw = fhWeek.gameweek;
                reason = `GW${fhWeek.gameweek}: ${fhWeek.reason}`;
                urgency = fhWeek.gameweek - currentGw <= 3 ? 'medium' : 'low';
            } else {
                const dgw = findNextDoubleGameweek(currentGw, deadlineGw, fixtures);
                if (dgw) {
                    reason = `Consider for Double Gameweek ${dgw}`;
                } else if (deadlineGw <= 19) {
                    reason = "Hold for a Blank or Double Gameweek before GW19";
                } else {
                    const estimatedGw = currentGw < 29 ? 29 : (currentGw < 34 ? 34 : 37);
                    reason = `Hold for a Blank or Double Gameweek (Likely GW${estimatedGw})`;
                }
            }
        } else if (deadlineGw <= 19) {
            reason = "Hold for a Blank or Double Gameweek before GW19";
        }
    }

    // If no specific recommendation found but chip is available, ensure we return a neutral state
    if (!recommendedGw && !reason) {
        reason = "Hold for now. No immediate opportunities detected.";
    }

    return {
        chipName: displayName,
        status: 'available',
        recommendedGameweek: recommendedGw,
        reason: reason,
        urgency: urgency
    };
}

function findNextDoubleGameweek(startGw: number, endGw: number, fixtures: Fixture[]): number | null {
    // Count fixtures per team per gameweek
    const counts: { [gw: number]: { [team: number]: number } } = {};

    fixtures.forEach(f => {
        if (f.event >= startGw && f.event <= endGw) {
            if (!counts[f.event]) counts[f.event] = {};
            counts[f.event][f.team_h] = (counts[f.event][f.team_h] || 0) + 1;
            counts[f.event][f.team_a] = (counts[f.event][f.team_a] || 0) + 1;
        }
    });

    // Find first GW where any team has > 1 fixture
    for (let gw = startGw; gw <= endGw; gw++) {
        if (counts[gw]) {
            for (const teamId in counts[gw]) {
                if (counts[gw][teamId] > 1) return gw;
            }
        }
    }
    return null;
}

function findNextBlankGameweek(startGw: number, endGw: number, fixtures: Fixture[]): number | null {
    // Count fixtures per team per gameweek
    const counts: { [gw: number]: { [team: number]: number } } = {};
    const teamsInLeague = 20;

    fixtures.forEach(f => {
        if (f.event >= startGw && f.event <= endGw) {
            if (!counts[f.event]) counts[f.event] = {};
            counts[f.event][f.team_h] = (counts[f.event][f.team_h] || 0) + 1;
            counts[f.event][f.team_a] = (counts[f.event][f.team_a] || 0) + 1;
        }
    });

    // Find first GW where total teams playing < 20 (or significantly less)
    // Note: Some BGWs have just 2 teams missing.
    for (let gw = startGw; gw <= endGw; gw++) {
        if (counts[gw]) {
            const teamsPlaying = Object.keys(counts[gw]).length;
            if (teamsPlaying < 16) return gw; // Significant blank
        }
    }
    return null;
}

// ===== INTELLIGENT CHIP ANALYSIS FUNCTIONS =====

interface FixtureAnalysis {
    gameweek: number;
    avgDifficulty: number;
    teamsWithEasyFixtures: number;
    teamsWithHardFixtures: number;
}

interface TripleCaptainOpportunity {
    gameweek: number;
    player: Player;
    opponentName: string;
    difficulty: number;
    estimatedPoints: number;
}

function analyzeFixtureDifficulty(fixtures: Fixture[], teams: Team[], startGw: number, endGw: number): FixtureAnalysis[] {
    const analysis: FixtureAnalysis[] = [];

    for (let gw = startGw; gw <= endGw; gw++) {
        const gwFixtures = fixtures.filter(f => f.event === gw);
        if (gwFixtures.length === 0) continue;

        let totalDifficulty = 0;
        let easyCount = 0;
        let hardCount = 0;

        gwFixtures.forEach(f => {
            const homeDiff = f.team_h_difficulty;
            const awayDiff = f.team_a_difficulty;

            totalDifficulty += homeDiff + awayDiff;

            if (homeDiff <= 2) easyCount++;
            if (awayDiff <= 2) easyCount++;
            if (homeDiff >= 4) hardCount++;
            if (awayDiff >= 4) hardCount++;
        });

        analysis.push({
            gameweek: gw,
            avgDifficulty: totalDifficulty / (gwFixtures.length * 2),
            teamsWithEasyFixtures: easyCount,
            teamsWithHardFixtures: hardCount
        });
    }

    return analysis;
}

function findBestTripleCaptainWeek(allPlayers: Player[], fixtures: Fixture[], teams: Team[], startGw: number, endGw: number): TripleCaptainOpportunity | null {
    const premiumPlayers = allPlayers
        .filter(p => p.now_cost >= 100 && p.total_points > 50)
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 10);

    let bestOpportunity: TripleCaptainOpportunity | null = null;
    let bestScore = 0;

    for (let gw = startGw; gw <= endGw; gw++) {
        const gwFixtures = fixtures.filter(f => f.event === gw);

        premiumPlayers.forEach(player => {
            const playerTeam = teams.find(t => t.id === player.team);
            if (!playerTeam) return;

            const fixture = gwFixtures.find(f => f.team_h === player.team || f.team_a === player.team);
            if (!fixture) return;

            const isHome = fixture.team_h === player.team;
            const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
            const opponent = teams.find(t => t.id === (isHome ? fixture.team_a : fixture.team_h));

            if (!opponent) return;

            const basePoints = parseFloat(player.form) || 0;
            const difficultyMultiplier = difficulty <= 2 ? 1.5 : difficulty === 3 ? 1.0 : 0.7;
            const estimatedPoints = basePoints * difficultyMultiplier;

            const score = estimatedPoints * (6 - difficulty);

            if (score > bestScore) {
                bestScore = score;
                bestOpportunity = {
                    gameweek: gw,
                    player,
                    opponentName: opponent.short_name,
                    difficulty,
                    estimatedPoints
                };
            }
        });
    }

    return bestOpportunity;
}

function findBestFreeHitWeek(fixtures: Fixture[], teams: Team[], startGw: number, endGw: number): { gameweek: number; avgDifficulty: number; reason: string } | null {
    const analysis = analyzeFixtureDifficulty(fixtures, teams, startGw, endGw);

    if (analysis.length === 0) return null;

    const worst = analysis.reduce((prev, curr) =>
        curr.avgDifficulty > prev.avgDifficulty ? curr : prev
    );

    if (worst.avgDifficulty < 3.0) return null;

    return {
        gameweek: worst.gameweek,
        avgDifficulty: worst.avgDifficulty,
        reason: `High average fixture difficulty (${worst.avgDifficulty.toFixed(1)}/5) with ${worst.teamsWithHardFixtures} difficult fixtures`
    };
}

function findBestBenchBoostWeek(fixtures: Fixture[], teams: Team[], startGw: number, endGw: number): { gameweek: number; easyFixtures: number; reason: string } | null {
    const analysis = analyzeFixtureDifficulty(fixtures, teams, startGw, endGw);

    if (analysis.length === 0) return null;

    const best = analysis.reduce((prev, curr) =>
        curr.teamsWithEasyFixtures > prev.teamsWithEasyFixtures ? curr : prev
    );

    if (best.teamsWithEasyFixtures < 8) return null;

    return {
        gameweek: best.gameweek,
        easyFixtures: best.teamsWithEasyFixtures,
        reason: `${best.teamsWithEasyFixtures} teams with easy fixtures (difficulty ≤ 2)`
    };
}

function findBestWildcardPeriod(fixtures: Fixture[], teams: Team[], startGw: number, endGw: number): { gameweek: number; reason: string } | null {
    const analysis = analyzeFixtureDifficulty(fixtures, teams, startGw, endGw);

    if (analysis.length === 0) return null;

    let bestPeriodStart = -1;
    let bestPeriodLength = 0;
    let bestAvgDifficulty = 0;

    for (let i = 0; i < analysis.length - 2; i++) {
        const period = analysis.slice(i, i + 3);
        const avgDiff = period.reduce((sum, w) => sum + w.avgDifficulty, 0) / 3;

        if (avgDiff > 3.2 && avgDiff > bestAvgDifficulty) {
            bestPeriodStart = period[0].gameweek;
            bestPeriodLength = 3;
            bestAvgDifficulty = avgDiff;
        }
    }

    if (bestPeriodStart === -1) return null;

    return {
        gameweek: bestPeriodStart,
        reason: `Difficult fixture run from GW${bestPeriodStart} (avg difficulty: ${bestAvgDifficulty.toFixed(1)}/5 over ${bestPeriodLength} weeks)`
    };
}
