import { supabase } from './supabase';
import { Player } from './fpl-api';

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

export const TransferTracker = {
    // Save a new transfer decision
    trackDecision: async (decision: Omit<TransferDecision, 'id' | 'timestamp' | 'status'>) => {
        const newDecision = {
            ...decision,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'pending' as const
        };

        // Save to Supabase
        if (supabase) {
            const { error } = await supabase
                .from('fpl_decisions')
                .insert({
                    id: newDecision.id,
                    gameweek: newDecision.gameweek,
                    team_id: newDecision.teamId,
                    player_out_id: newDecision.playerOut.id,
                    player_in_id: newDecision.playerIn.id,
                    player_out_name: newDecision.playerOut.web_name,
                    player_in_name: newDecision.playerIn.web_name,
                    reasoning: newDecision.reasoning,
                    status: 'pending'
                });

            if (error) console.error('Error tracking decision:', error);
        } else if (typeof window !== 'undefined') {
            // LocalStorage Fallback
            const decisions = JSON.parse(localStorage.getItem('fpl_decisions') || '[]');
            decisions.unshift(newDecision);
            // Keep last 1000 to avoid quota issues
            if (decisions.length > 1000) decisions.length = 1000;
            localStorage.setItem('fpl_decisions', JSON.stringify(decisions));
        }

        return newDecision;
    },

    // Get all decisions
    getDecisions: async (): Promise<TransferDecision[]> => {
        if (supabase) {
            const { data, error } = await supabase
                .from('fpl_decisions')
                .select('*')
                .order('created_at', { ascending: false })
                .range(0, 9999);

            if (error) {
                console.error('Error fetching decisions:', error);
                return [];
            }

            return data.map((d: any) => ({
                id: d.id,
                gameweek: d.gameweek,
                teamId: d.team_id,
                playerOut: { id: d.player_out_id, web_name: d.player_out_name } as Player,
                playerIn: { id: d.player_in_id, web_name: d.player_in_name } as Player,
                reasoning: d.reasoning,
                timestamp: new Date(d.created_at).getTime(),
                status: d.status
            }));
        } else if (typeof window !== 'undefined') {
            // LocalStorage Fallback
            return JSON.parse(localStorage.getItem('fpl_decisions') || '[]');
        }
        return [];
    },

    // Record an outcome for a decision
    recordOutcome: async (outcome: Omit<TransferOutcome, 'timestamp'>) => {
        const newOutcome = {
            ...outcome,
            timestamp: Date.now()
        };

        if (supabase) {
            // Save Outcome
            const { error: outcomeError } = await supabase
                .from('fpl_outcomes')
                .insert({
                    decision_id: outcome.decisionId,
                    actual_points_gained: outcome.actualPointsGained,
                    weeks_evaluated: outcome.weeksEvaluated,
                    success_score: outcome.successScore
                });

            if (outcomeError) {
                console.error('Error recording outcome:', outcomeError);
                return null;
            }

            // Update Decision Status
            const { error: updateError } = await supabase
                .from('fpl_decisions')
                .update({ status: 'evaluated' })
                .eq('id', outcome.decisionId);

            if (updateError) console.error('Error updating decision status:', updateError);
        } else if (typeof window !== 'undefined') {
            // LocalStorage Fallback
            const outcomes = JSON.parse(localStorage.getItem('fpl_outcomes') || '[]');
            outcomes.unshift(newOutcome);
            // Keep last 1000
            if (outcomes.length > 1000) outcomes.length = 1000;
            localStorage.setItem('fpl_outcomes', JSON.stringify(outcomes));

            // Update local decision status
            const decisions = JSON.parse(localStorage.getItem('fpl_decisions') || '[]');
            const index = decisions.findIndex((d: TransferDecision) => d.id === outcome.decisionId);
            if (index !== -1) {
                decisions[index].status = 'evaluated';
                localStorage.setItem('fpl_decisions', JSON.stringify(decisions));
            }
        }

        return newOutcome;
    },

    // Get all outcomes
    getOutcomes: async (): Promise<TransferOutcome[]> => {
        if (supabase) {
            const { data, error } = await supabase
                .from('fpl_outcomes')
                .select('*')
                .order('created_at', { ascending: false })
                .range(0, 9999);

            if (error) {
                console.error('Error fetching outcomes:', error);
                return [];
            }

            return data.map((d: any) => ({
                decisionId: d.decision_id,
                actualPointsGained: d.actual_points_gained,
                weeksEvaluated: d.weeks_evaluated,
                successScore: d.success_score,
                timestamp: new Date(d.created_at).getTime()
            }));
        } else if (typeof window !== 'undefined') {
            // LocalStorage Fallback
            return JSON.parse(localStorage.getItem('fpl_outcomes') || '[]');
        }
        return [];
    },

    // Clear all data
    clearData: async () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('fpl_decisions');
            localStorage.removeItem('fpl_outcomes');
        }
        // Not implemented for Supabase to avoid accidental wipes
    }
};
