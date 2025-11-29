import { Player, Team } from './fpl-api';

export interface TransferDecision {
    id: string;
    gameweek: number;
    teamId: number;
    playerOut: Player;
    playerIn: Player;
    reasoning: {
        formWeight: number;
        fixtureWeight: number;
        ictWeight: number;
        priceWeight: number;
        score: number;
    };
    timestamp: number;
    status: 'pending' | 'evaluated';
}

export interface TransferOutcome {
    decisionId: string;
    actualPointsGained: number; // Points difference (In - Out) over N weeks
    weeksEvaluated: number;
    successScore: number; // 0-100
    timestamp: number;
}

const STORAGE_KEY_DECISIONS = 'fpl_ml_decisions';
const STORAGE_KEY_OUTCOMES = 'fpl_ml_outcomes';

export const TransferTracker = {
    // Save a new transfer decision
    trackDecision: (decision: Omit<TransferDecision, 'id' | 'timestamp' | 'status'>) => {
        if (typeof window === 'undefined') return;

        const newDecision: TransferDecision = {
            ...decision,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'pending'
        };

        const decisions = TransferTracker.getDecisions();
        decisions.push(newDecision);
        localStorage.setItem(STORAGE_KEY_DECISIONS, JSON.stringify(decisions));
        return newDecision;
    },

    // Get all decisions
    getDecisions: (): TransferDecision[] => {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(STORAGE_KEY_DECISIONS);
        return data ? JSON.parse(data) : [];
    },

    // Record an outcome for a decision
    recordOutcome: (outcome: Omit<TransferOutcome, 'timestamp'>) => {
        if (typeof window === 'undefined') return;

        const newOutcome: TransferOutcome = {
            ...outcome,
            timestamp: Date.now()
        };

        const outcomes = TransferTracker.getOutcomes();
        outcomes.push(newOutcome);
        localStorage.setItem(STORAGE_KEY_OUTCOMES, JSON.stringify(outcomes));

        // Update decision status
        const decisions = TransferTracker.getDecisions();
        const decisionIndex = decisions.findIndex(d => d.id === outcome.decisionId);
        if (decisionIndex !== -1) {
            decisions[decisionIndex].status = 'evaluated';
            localStorage.setItem(STORAGE_KEY_DECISIONS, JSON.stringify(decisions));
        }

        return newOutcome;
    },

    // Get all outcomes
    getOutcomes: (): TransferOutcome[] => {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(STORAGE_KEY_OUTCOMES);
        return data ? JSON.parse(data) : [];
    },

    // Clear all data (for reset)
    clearData: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(STORAGE_KEY_DECISIONS);
        localStorage.removeItem(STORAGE_KEY_OUTCOMES);
    }
};
