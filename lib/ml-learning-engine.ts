import { supabase } from './supabase';
import { TransferTracker, TransferDecision, TransferOutcome } from './ml-transfer-tracker';

export interface AlgorithmWeights {
    formWeight: number;
    fixtureWeight: number;
    ictWeight: number;
    priceWeight: number;
    customWeights?: Record<string, number>; // Dynamic metrics
}

const DEFAULT_WEIGHTS: AlgorithmWeights = {
    formWeight: 0.5,
    fixtureWeight: 0.3,
    ictWeight: 0.15,
    priceWeight: 0.05,
    customWeights: {}
};

export const LearningEngine = {
    // Get current weights (Merge DB + LocalStorage)
    getCurrentWeights: async (): Promise<AlgorithmWeights> => {
        let weights = { ...DEFAULT_WEIGHTS };

        // 1. Get Core Weights from DB
        if (supabase) {
            const { data, error } = await supabase
                .from('fpl_weights')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(1);

            if (!error && data && data.length > 0) {
                weights.formWeight = data[0].form_weight;
                weights.fixtureWeight = data[0].fixture_weight;
                weights.ictWeight = data[0].ict_weight;
                weights.priceWeight = data[0].price_weight;
            }
        } else if (typeof window !== 'undefined') {
            // LocalStorage Fallback for Core Weights
            const stored = localStorage.getItem('fpl_core_weights');
            if (stored) {
                try {
                    const core = JSON.parse(stored);
                    weights.formWeight = core.formWeight;
                    weights.fixtureWeight = core.fixtureWeight;
                    weights.ictWeight = core.ictWeight;
                    weights.priceWeight = core.priceWeight;
                } catch (e) {
                    console.error('Failed to parse core weights', e);
                }
            }
        }

        // 2. Get Custom Weights from LocalStorage (Client-side only)
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('fpl_custom_weights');
            if (stored) {
                try {
                    weights.customWeights = JSON.parse(stored);
                } catch (e) {
                    console.error('Failed to parse custom weights', e);
                }
            }
        }

        return weights;
    },

    // Reset to defaults
    resetWeights: async () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('fpl_custom_weights');
            localStorage.removeItem('fpl_core_weights');
        }

        if (supabase) {
            // Deactivate all current weights
            await supabase
                .from('fpl_weights')
                .update({ active: false })
                .eq('active', true);

            // Insert default
            const { error } = await supabase
                .from('fpl_weights')
                .insert({
                    form_weight: DEFAULT_WEIGHTS.formWeight,
                    fixture_weight: DEFAULT_WEIGHTS.fixtureWeight,
                    ict_weight: DEFAULT_WEIGHTS.ictWeight,
                    price_weight: DEFAULT_WEIGHTS.priceWeight,
                    active: true
                });

            if (error) console.error('Error resetting weights:', error);
        }
    },

    // Train the model based on recorded outcomes
    trainModel: async (): Promise<{ success: boolean; message: string; newWeights: AlgorithmWeights }> => {
        const currentWeights = await LearningEngine.getCurrentWeights();
        const outcomes = await TransferTracker.getOutcomes();

        if (outcomes.length < 10) {
            return { success: false, message: 'Not enough data to train (need 10+ outcomes)', newWeights: currentWeights };
        }

        const improvements: string[] = [];
        const newWeights = { ...currentWeights };

        // Ensure customWeights object exists
        if (!newWeights.customWeights) newWeights.customWeights = {};

        // 1. Join outcomes with decisions
        const decisions = await TransferTracker.getDecisions();
        const analyzedData = outcomes.map(outcome => {
            const decision = decisions.find(d => d.id === outcome.decisionId);
            return { outcome, decision };
        }).filter(item => item.decision !== undefined);

        // 2. Separate into success and failure
        const successes = analyzedData.filter(item => item.outcome.actualPointsGained > 0);
        const successRate = successes.length / analyzedData.length;

        // 3. Evolution Logic
        if (successRate < 0.4) {
            // Exploration (Large perturbation)
            improvements.push(`Success rate low (${(successRate * 100).toFixed(0)}%). Exploring new strategies.`);

            newWeights.formWeight = perturb(currentWeights.formWeight, 0.4);
            newWeights.fixtureWeight = perturb(currentWeights.fixtureWeight, 0.4);

            // Perturb custom weights too
            Object.keys(newWeights.customWeights).forEach(key => {
                newWeights.customWeights![key] = perturb(newWeights.customWeights![key], 0.4);
            });

        } else {
            // Exploitation (Fine-tuning)
            improvements.push(`Success rate good (${(successRate * 100).toFixed(0)}%). Fine-tuning strategy.`);

            newWeights.formWeight = perturb(currentWeights.formWeight, 0.1);
            newWeights.fixtureWeight = perturb(currentWeights.fixtureWeight, 0.1);

            // Perturb custom weights too
            Object.keys(newWeights.customWeights).forEach(key => {
                newWeights.customWeights![key] = perturb(newWeights.customWeights![key], 0.1);
            });
        }

        // Normalize all weights (Core + Custom)
        let total =
            newWeights.formWeight +
            newWeights.fixtureWeight +
            newWeights.ictWeight +
            newWeights.priceWeight;

        Object.values(newWeights.customWeights).forEach(w => total += w);

        if (total > 0) {
            newWeights.formWeight /= total;
            newWeights.fixtureWeight /= total;
            newWeights.ictWeight /= total;
            newWeights.priceWeight /= total;

            Object.keys(newWeights.customWeights).forEach(key => {
                newWeights.customWeights![key] /= total;
            });
        }

        // Save Core Weights to Supabase
        if (supabase) {
            await supabase
                .from('fpl_weights')
                .insert({
                    form_weight: newWeights.formWeight,
                    fixture_weight: newWeights.fixtureWeight,
                    ict_weight: newWeights.ictWeight,
                    price_weight: newWeights.priceWeight,
                    active: true
                });
        } else if (typeof window !== 'undefined') {
            // LocalStorage Fallback for Core Weights
            localStorage.setItem('fpl_core_weights', JSON.stringify({
                formWeight: newWeights.formWeight,
                fixtureWeight: newWeights.fixtureWeight,
                ictWeight: newWeights.ictWeight,
                priceWeight: newWeights.priceWeight
            }));
        }

        // Save Custom Weights to LocalStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('fpl_custom_weights', JSON.stringify(newWeights.customWeights));
        }

        return { success: true, message: improvements.join(' '), newWeights };
    }
};

// Helper for perturbation
function perturb(val: number, magnitude: number): number {
    return Math.max(0.01, Math.min(0.99, val + (Math.random() - 0.5) * magnitude));
}
