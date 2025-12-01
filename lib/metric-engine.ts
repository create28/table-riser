import { Player } from './fpl-api';

export interface MetricDefinition {
    id: string;
    name: string;
    description: string;
    getValue: (player: Player) => number;
    category: 'attacking' | 'defensive' | 'possession' | 'market' | 'other';
}

export const AVAILABLE_METRICS: MetricDefinition[] = [
    {
        id: 'xg',
        name: 'Expected Goals (xG)',
        description: 'Measure of the quality of goalscoring chances',
        getValue: (p) => parseFloat(p.expected_goals || '0'),
        category: 'attacking'
    },
    {
        id: 'xa',
        name: 'Expected Assists (xA)',
        description: 'Measure of the likelihood that a pass will become a goal assist',
        getValue: (p) => parseFloat(p.expected_assists || '0'),
        category: 'attacking'
    },
    {
        id: 'xgi',
        name: 'Expected Goal Involvements (xGI)',
        description: 'Combined xG + xA',
        getValue: (p) => parseFloat(p.expected_goal_involvements || '0'),
        category: 'attacking'
    },
    {
        id: 'threat',
        name: 'ICT Threat',
        description: 'Gauge of how likely a player is to score goals',
        getValue: (p) => parseFloat(p.threat || '0'),
        category: 'attacking'
    },
    {
        id: 'creativity',
        name: 'ICT Creativity',
        description: 'Gauge of a player\'s ability to create goalscoring opportunities',
        getValue: (p) => parseFloat(p.creativity || '0'),
        category: 'attacking'
    },
    {
        id: 'influence',
        name: 'ICT Influence',
        description: 'Degree to which a player has made an impact on a match',
        getValue: (p) => parseFloat(p.influence || '0'),
        category: 'possession'
    },
    {
        id: 'bps',
        name: 'Bonus Points System',
        description: 'Underlying stats used to calculate bonus points',
        getValue: (p) => p.bps || 0,
        category: 'other'
    },
    {
        id: 'selected_by',
        name: 'Ownership %',
        description: 'Percentage of teams selected by',
        getValue: (p) => parseFloat(p.selected_by_percent || '0'),
        category: 'market'
    },
    {
        id: 'transfers_in',
        name: 'Transfers In (Event)',
        description: 'Number of transfers in for the current gameweek',
        getValue: (p) => p.transfers_in_event || 0,
        category: 'market'
    }
];

export interface MetricCorrelation {
    metricId: string;
    name: string;
    correlation: number; // -1 to 1
    sampleSize: number;
}

export class MetricScout {
    static analyzeCorrelations(
        players: Player[],
        histories: { [key: number]: any }
    ): MetricCorrelation[] {
        const results: MetricCorrelation[] = [];

        AVAILABLE_METRICS.forEach(metric => {
            let sumX = 0;
            let sumY = 0;
            let sumXY = 0;
            let sumX2 = 0;
            let sumY2 = 0;
            let n = 0;

            // Iterate through all players with history
            players.forEach(player => {
                const history = histories[player.id]?.history;
                if (!history || history.length < 5) return;

                // Look at past gameweeks
                // We want to correlate Metric(GW_i) with Points(GW_i+1)
                // Actually, simpler: Metric(GW_i) with Points(GW_i) to see if it explains performance
                // OR Metric(Average of last 3) with Points(Next) for predictive power.

                // Let's do: Metric(GW_i) vs Points(GW_i) for now to find "explanatory" power
                // Ideally we want predictive, but that requires reconstructing past state.
                // Let's use the current 'form' of the metric vs 'form' of points?

                // Let's use the raw history data points
                history.forEach((gwData: any) => {
                    // We need to extract the metric value from the history entry
                    // The history entry structure mirrors Player but might have different field names
                    // For simplicity, we'll try to map common fields

                    let val = 0;
                    // Map metric ID to history field
                    if (metric.id === 'xg') val = parseFloat(gwData.expected_goals || '0');
                    else if (metric.id === 'xa') val = parseFloat(gwData.expected_assists || '0');
                    else if (metric.id === 'xgi') val = parseFloat(gwData.expected_goal_involvements || '0');
                    else if (metric.id === 'threat') val = parseFloat(gwData.threat || '0');
                    else if (metric.id === 'creativity') val = parseFloat(gwData.creativity || '0');
                    else if (metric.id === 'influence') val = parseFloat(gwData.influence || '0');
                    else if (metric.id === 'bps') val = gwData.bps || 0;
                    else if (metric.id === 'selected_by') val = parseFloat(gwData.selected || '0'); // History usually has 'selected' count not percent
                    else if (metric.id === 'transfers_in') val = gwData.transfers_in || 0;

                    const points = gwData.total_points;

                    sumX += val;
                    sumY += points;
                    sumXY += val * points;
                    sumX2 += val * val;
                    sumY2 += points * points;
                    n++;
                });
            });

            if (n > 0) {
                const numerator = n * sumXY - sumX * sumY;
                const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
                const correlation = denominator === 0 ? 0 : numerator / denominator;

                results.push({
                    metricId: metric.id,
                    name: metric.name,
                    correlation,
                    sampleSize: n
                });
            }
        });

        return results.sort((a, b) => b.correlation - a.correlation);
    }
}
