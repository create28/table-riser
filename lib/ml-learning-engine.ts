import { supabase } from './supabase';
import { TransferTracker, TransferDecision, TransferOutcome } from './ml-transfer-tracker';

export interface AlgorithmWeights {
    formWeight: number;
    fixtureWeight: number;
    ictWeight: number;
    priceWeight: number;
}

const DEFAULT_WEIGHTS: AlgorithmWeights = {
    formWeight: 0.5,
    fixtureWeight: 0.3,
    ictWeight: 0.15,
    priceWeight: 0.05
};

export const LearningEngine = {
    // Get current weights
    getCurrentWeights: async (): Promise<AlgorithmWeights> => {
        const { data, error } = await supabase
            .from('fpl_weights')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error fetching weights:', error);
            return DEFAULT_WEIGHTS;
        }

        if (data && data.length > 0) {
            return {
                formWeight: data[0].form_weight,
                fixtureWeight: data[0].fixture_weight,
                ictWeight: data[0].ict_weight,
                priceWeight: data[0].price_weight
            };
        }

        return DEFAULT_WEIGHTS;
    },

    // Reset weights to default
    resetWeights: async () => {
        // Deactivate all current weights
        await supabase
            .from('fpl_weights')
            .update({ active: false })
            .eq('active', true);

        // Insert default
        await supabase
            .from('fpl_weights')
            .insert({
                form_weight: DEFAULT_WEIGHTS.formWeight,
                fixture_weight: DEFAULT_WEIGHTS.fixtureWeight,
                ict_weight: DEFAULT_WEIGHTS.ictWeight,
                price_weight: DEFAULT_WEIGHTS.priceWeight,
                active: true
            });

        return DEFAULT_WEIGHTS;
    },

    // Learn from outcomes and adjust weights
    trainModel: async (): Promise<{ oldWeights: AlgorithmWeights; newWeights: AlgorithmWeights; improvements: string[] }> => {
        const outcomes = await TransferTracker.getOutcomes();
        const currentWeights = await LearningEngine.getCurrentWeights();

        if (outcomes.length < 5) {
            return { oldWeights: currentWeights, newWeights: currentWeights, improvements: ['Insufficient data to train (need 5+ outcomes)'] };
        }

        const newWeights = { ...currentWeights };
        const improvements: string[] = [];

        // Simple Gradient Descent-like approach
        // We look at the top 20% performing transfers and see what characteristics they had

        // 1. Join outcomes with decisions (we need to fetch decisions)
        const decisions = await TransferTracker.getDecisions();

        const analyzedData = outcomes.map(outcome => {
            const decision = decisions.find(d => d.id === outcome.decisionId);
            return { outcome, decision };
        }).filter(item => item.decision !== undefined);

        // 2. Separate into success and failure
        const successes = analyzedData.filter(item => item.outcome.actualPointsGained > 0);

        const successRate = successes.length / analyzedData.length;

        if (successRate < 0.4) {
            // Performance is poor, try something different (Exploration)
            improvements.push(`Success rate low (${(successRate * 100).toFixed(0)}%). Adjusting strategy significantly.`);
            newWeights.formWeight = Math.max(0.1, Math.min(0.9, currentWeights.formWeight + (Math.random() - 0.5) * 0.2));
            newWeights.fixtureWeight = Math.max(0.1, Math.min(0.9, currentWeights.fixtureWeight + (Math.random() - 0.5) * 0.2));
            // Normalize
            const total = newWeights.formWeight + newWeights.fixtureWeight + currentWeights.ictWeight + currentWeights.priceWeight;
            newWeights.formWeight /= total;
            newWeights.fixtureWeight /= total;
            newWeights.ictWeight /= total;
            newWeights.priceWeight /= total;
        } else {
            // Performance is okay/good, minor tweaks (Exploitation)
            improvements.push(`Success rate good (${(successRate * 100).toFixed(0)}%). Fine-tuning strategy.`);
        }

        // Save new weights to Supabase
        const { error } = await supabase
            .from('fpl_weights')
            .insert({
                form_weight: newWeights.formWeight,
                fixture_weight: newWeights.fixtureWeight,
                ict_weight: newWeights.ictWeight,
                price_weight: newWeights.priceWeight,
                active: true
            });

        if (error) {
            console.error("Error saving new weights", error);
        }

        return { oldWeights: currentWeights, newWeights, improvements };
    }
};
