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
        if (!supabase) return newDecision;
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

        if (error) {
            console.error('Error tracking decision:', error);
        }

        return newDecision;
    },

    // Get all decisions
    getDecisions: async (): Promise<TransferDecision[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('fpl_decisions')
            .select('*')
            .order('created_at', { ascending: false })
            .range(0, 9999);

        if (error) {
            console.error('Error fetching decisions:', error);
            return [];
        }

        // Map back to our interface (simplified, as we don't store full player objects in DB)
        // We reconstruct minimal player objects for the interface
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
    },

    // Record an outcome for a decision
    recordOutcome: async (outcome: Omit<TransferOutcome, 'timestamp'>) => {
        const newOutcome = {
            ...outcome,
            timestamp: Date.now()
        };

        // Save Outcome
        if (!supabase) return newOutcome;
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

        if (updateError) {
            console.error('Error updating decision status:', updateError);
        }

        return newOutcome;
    },

    // Get all outcomes
    getOutcomes: async (): Promise<TransferOutcome[]> => {
        if (!supabase) return [];
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
    },

    // Clear all data (Not implemented for Supabase to avoid accidental wipes)
    clearData: async () => {
        console.warn('Clear data not implemented for Supabase storage');
    }
};
