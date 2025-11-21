/**
 * Example usage of the createBestTeam function
 * This demonstrates how to create the best FPL team with a 100.0m budget
 */

import { fetchBootstrapStatic, fetchFixtures } from './fpl-api';
import { createBestTeam } from './optimization';
import { loadHistoricalData } from './historical-data';

/**
 * Example: Create the best team for a single gameweek (Free Hit style)
 */
export async function exampleCreateBestTeamSingleGW() {
    // 1. Fetch the latest FPL data
    const bootstrap = await fetchBootstrapStatic();
    const fixtures = await fetchFixtures();
    const allPlayers = bootstrap.elements;

    // 2. Optionally load historical data for better predictions
    const historicalData = await loadHistoricalData();

    // 3. Create the best team with 100.0m budget
    const bestTeam = createBestTeam(
        allPlayers,
        fixtures,
        1, // Single gameweek
        historicalData
    );

    // 4. Display the results
    console.log('=== BEST TEAM (100.0m Budget) ===');
    console.log(`Total Cost: £${(bestTeam.totalCost / 10).toFixed(1)}m`);
    console.log(`Expected Points: ${bestTeam.totalExpectedPoints.toFixed(1)}`);
    console.log('\nSTARTERS:');
    bestTeam.starters.forEach(player => {
        const isCaptain = player.id === bestTeam.captain.id;
        const isVice = player.id === bestTeam.viceCaptain.id;
        const badge = isCaptain ? ' (C)' : isVice ? ' (VC)' : '';
        console.log(`  ${player.web_name}${badge} - £${(player.now_cost / 10).toFixed(1)}m - xP: ${player.xP.toFixed(1)}`);
    });
    console.log('\nBENCH:');
    bestTeam.bench.forEach(player => {
        console.log(`  ${player.web_name} - £${(player.now_cost / 10).toFixed(1)}m - xP: ${player.xP.toFixed(1)}`);
    });

    return bestTeam;
}

/**
 * Example: Create the best team for multiple gameweeks (Wildcard style)
 */
export async function exampleCreateBestTeamWildcard() {
    const bootstrap = await fetchBootstrapStatic();
    const fixtures = await fetchFixtures();
    const allPlayers = bootstrap.elements;
    const historicalData = await loadHistoricalData();

    // Create best team optimized for next 5 gameweeks
    const bestTeam = createBestTeam(
        allPlayers,
        fixtures,
        5, // 5 gameweeks
        historicalData
    );

    console.log('=== BEST WILDCARD TEAM (100.0m Budget, 5 GWs) ===');
    console.log(`Total Cost: £${(bestTeam.totalCost / 10).toFixed(1)}m`);
    console.log(`Expected Points: ${bestTeam.totalExpectedPoints.toFixed(1)}`);

    return bestTeam;
}

/**
 * Example: Create best team with specific constraints
 */
export async function exampleCreateBestTeamWithConstraints() {
    const bootstrap = await fetchBootstrapStatic();
    const fixtures = await fetchFixtures();
    const allPlayers = bootstrap.elements;
    const historicalData = await loadHistoricalData();

    // Example: Force include Haaland (id: 354) and exclude Salah (id: 306)
    const bestTeam = createBestTeam(
        allPlayers,
        fixtures,
        1,
        historicalData,
        [306], // Exclude Salah
        [354]  // Include Haaland
    );

    console.log('=== BEST TEAM WITH CONSTRAINTS ===');
    console.log(`Total Cost: £${(bestTeam.totalCost / 10).toFixed(1)}m`);
    console.log(`Expected Points: ${bestTeam.totalExpectedPoints.toFixed(1)}`);

    return bestTeam;
}
