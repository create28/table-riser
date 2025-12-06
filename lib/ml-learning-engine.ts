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
        // 3. Evolution Logic
        // Calculate dynamic learning rate based on sample size
        // As outcomes grow, the perturbation magnitude should shrink (Annealing)
        // Base rate starts at 0.4 (exploration) and decays to 0.05 (precision)
        const learningRate = Math.max(0.05, 0.4 * Math.exp(-outcomes.length / 500));

        if (successRate < 0.4) {
            // Exploration (Large perturbation)
            // If performing poorly, keep learning rate higher
            const exploreRate = Math.max(0.2, learningRate * 1.5);
            improvements.push(`Success rate low (${(successRate * 100).toFixed(0)}%). Increasing search space (Rate: ${exploreRate.toFixed(3)}).`);

            newWeights.formWeight = perturb(currentWeights.formWeight, exploreRate);
            newWeights.fixtureWeight = perturb(currentWeights.fixtureWeight, exploreRate);

            // Perturb custom weights too
            Object.keys(newWeights.customWeights).forEach(key => {
                newWeights.customWeights![key] = perturb(newWeights.customWeights![key], exploreRate);
            });

        } else {
            // Exploitation (Fine-tuning)
            improvements.push(`Success rate good (${(successRate * 100).toFixed(0)}%). refining weights (Rate: ${learningRate.toFixed(3)}).`);

            newWeights.formWeight = perturb(currentWeights.formWeight, learningRate);
            newWeights.fixtureWeight = perturb(currentWeights.fixtureWeight, learningRate);

            // Perturb custom weights too
            Object.keys(newWeights.customWeights).forEach(key => {
                newWeights.customWeights![key] = perturb(newWeights.customWeights![key], learningRate);
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
