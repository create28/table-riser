import { BootstrapStatic, Fixture } from './fpl-api';

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
    fixtures: Fixture[]
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
            fixtures
        ));

        // Triple Captain
        set1.chips.push(analyzeChip(
            '3xc',
            'Triple Captain',
            currentGameweek,
            19,
            isChipUsed('3xc', 'set1'),
            fixtures
        ));

        // Bench Boost
        set1.chips.push(analyzeChip(
            'bboost',
            'Bench Boost',
            currentGameweek,
            19,
            isChipUsed('bboost', 'set1'),
            fixtures
        ));

        // Free Hit
        set1.chips.push(analyzeChip(
            'freehit',
            'Free Hit',
            currentGameweek,
            19,
            isChipUsed('freehit', 'set1'),
            fixtures
        ));

        // Mystery Chip (Set 1 Only)
        set1.chips.push(analyzeChip(
            'mystery',
            'Mystery Chip',
            currentGameweek,
            19,
            isChipUsed('mystery', 'set1'),
            fixtures
        ));
    } else {
        // Set 1 is over
        set1.chips = [
            { chipName: 'Wildcard', status: 'unavailable', recommendedGameweek: null, reason: 'Expired (GW1-19)', urgency: 'none' },
            { chipName: 'Triple Captain', status: 'unavailable', recommendedGameweek: null, reason: 'Expired (GW1-19)', urgency: 'none' },
            { chipName: 'Bench Boost', status: 'unavailable', recommendedGameweek: null, reason: 'Expired (GW1-19)', urgency: 'none' },
            { chipName: 'Free Hit', status: 'unavailable', recommendedGameweek: null, reason: 'Expired (GW1-19)', urgency: 'none' },
            { chipName: 'Mystery Chip', status: 'unavailable', recommendedGameweek: null, reason: 'Expired (GW1-19)', urgency: 'none' },
        ];
    }

    // --- Analyze Set 2 ---
    if (currentGameweek >= 20) {
        // Logic for Set 2 (similar to Set 1 but different deadline)
        set2.chips.push(analyzeChip('wildcard', 'Wildcard', currentGameweek, 38, isChipUsed('wildcard', 'set2'), fixtures));
        set2.chips.push(analyzeChip('3xc', 'Triple Captain', currentGameweek, 38, isChipUsed('3xc', 'set2'), fixtures));
        set2.chips.push(analyzeChip('bboost', 'Bench Boost', currentGameweek, 38, isChipUsed('bboost', 'set2'), fixtures));
        set2.chips.push(analyzeChip('freehit', 'Free Hit', currentGameweek, 38, isChipUsed('freehit', 'set2'), fixtures));
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
    fixtures: Fixture[]
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
        // Recommend WC if many injuries or bad form (would need player data, for now generic)
        // Or before a fixture swing
        if (urgency === 'high') {
            recommendedGw = currentGw; // Use now if running out of time
        } else {
            reason = "Save for major team restructure or fixture swing";
        }
    } else if (apiName === '3xc') {
        // Recommend on DGW
        const dgw = findNextDoubleGameweek(currentGw, deadlineGw, fixtures);
        if (dgw) {
            recommendedGw = dgw;
            reason = `Target Double Gameweek ${dgw}`;
            if (dgw - currentGw <= 2) urgency = 'high';
        } else {
            reason = "Save for a Double Gameweek";
        }
    } else if (apiName === 'bboost') {
        // Recommend on DGW
        const dgw = findNextDoubleGameweek(currentGw, deadlineGw, fixtures);
        if (dgw) {
            recommendedGw = dgw;
            reason = `Target Double Gameweek ${dgw} with strong bench`;
        } else {
            reason = "Save for a Double Gameweek";
        }
    } else if (apiName === 'freehit') {
        // Recommend on BGW (Blank Gameweek)
        const bgw = findNextBlankGameweek(currentGw, deadlineGw, fixtures);
        if (bgw) {
            recommendedGw = bgw;
            reason = `Target Blank Gameweek ${bgw}`;
            if (bgw - currentGw <= 2) urgency = 'high';
        } else {
            // Or DGW
            const dgw = findNextDoubleGameweek(currentGw, deadlineGw, fixtures);
            if (dgw) {
                reason = `Consider for Double Gameweek ${dgw}`;
            } else {
                reason = "Hold for a Blank or Double Gameweek later in the season";
            }
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
