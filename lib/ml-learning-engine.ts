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

const STORAGE_KEY_WEIGHTS = 'fpl_ml_weights';

export const LearningEngine = {
    // Get current weights
    getCurrentWeights: (): AlgorithmWeights => {
        if (typeof window === 'undefined') return DEFAULT_WEIGHTS;
        const data = localStorage.getItem(STORAGE_KEY_WEIGHTS);
        return data ? JSON.parse(data) : DEFAULT_WEIGHTS;
    },

    // Reset weights to default
    resetWeights: () => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEY_WEIGHTS, JSON.stringify(DEFAULT_WEIGHTS));
        return DEFAULT_WEIGHTS;
    },

    // Learn from outcomes and adjust weights
    trainModel: (): { oldWeights: AlgorithmWeights; newWeights: AlgorithmWeights; improvements: string[] } => {
        const outcomes = TransferTracker.getOutcomes();
        const decisions = TransferTracker.getDecisions();
        const currentWeights = LearningEngine.getCurrentWeights();

        if (outcomes.length < 5) {
            return { oldWeights: currentWeights, newWeights: currentWeights, improvements: ['Insufficient data to train (need 5+ outcomes)'] };
        }

        const newWeights = { ...currentWeights };
        const improvements: string[] = [];

        // Simple Gradient Descent-like approach
        // We look at the top 20% performing transfers and see what characteristics they had

        // 1. Join outcomes with decisions
        const analyzedData = outcomes.map(outcome => {
            const decision = decisions.find(d => d.id === outcome.decisionId);
            return { outcome, decision };
        }).filter(item => item.decision !== undefined);

        // 2. Separate into success and failure
        const successes = analyzedData.filter(item => item.outcome.actualPointsGained > 0);
        const failures = analyzedData.filter(item => item.outcome.actualPointsGained < 0);

        if (successes.length === 0) {
            return { oldWeights: currentWeights, newWeights: currentWeights, improvements: ['No successful transfers to learn from yet'] };
        }

        // 3. Analyze Success Factors
        // Did successful transfers rely more on Form or Fixtures?
        // We can't easily know "why" it worked without more granular data, 
        // but we can see if the "reasoning" scores correlated.

        // For this V1, we'll use a simplified heuristic:
        // If Form was the dominant factor in the decision score, and it succeeded -> Boost Form

        let formBoost = 0;
        let fixtureBoost = 0;
        let ictBoost = 0;

        successes.forEach(({ decision }) => {
            if (!decision) return;
            // This is a simplification. In a real ML model, we'd use features of the player, not just the weights used.
            // But for "self-tuning weights", we want to reinforce the weights that were high during success.

            // However, the decision.reasoning stores the weights used at the time.
            // We need to know if the PLAYER had high form or good fixtures.
            // Since we don't have the raw player stats from the past easily accessible here without storing them,
            // we will rely on the fact that if the model recommended it, it scored high.

            // Let's assume we want to converge towards weights that produce better outcomes.
            // This part requires the simulation to run with *varied* weights to find the best ones.
            // If we always use static weights, we can't learn much.
            // So the "Training Mode" should introduce randomness (Epsilon-Greedy).
        });

        // REVISED STRATEGY:
        // The "Training Mode" will run simulations with slightly randomized weights.
        // We then see which set of weights produced the best average return.

        // Group outcomes by the weights used (rounded to 1 decimal place)
        // This is getting complex for a client-side only implementation.

        // SIMPLER STRATEGY for V1:
        // We will simply track the "Success Rate" of the current model.
        // If the success rate is low (< 40%), we randomly perturb the weights to "explore".
        // If the success rate is high (> 60%), we "exploit" (keep weights, maybe refine slightly).

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
            // We could look at the most successful transfer and see if it was a "Form" pick or "Fixture" pick
            // For now, let's just stabilize.
        }

        // Save new weights
        localStorage.setItem(STORAGE_KEY_WEIGHTS, JSON.stringify(newWeights));

        return { oldWeights: currentWeights, newWeights, improvements };
    }
};
