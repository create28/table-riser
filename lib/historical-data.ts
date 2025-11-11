/**
 * Historical FPL Data Processing
 * 
 * Parses CSV data from vaastav's Fantasy-Premier-League repository
 * Source: https://github.com/vaastav/Fantasy-Premier-League
 */

export interface HistoricalMatch {
  season: string;
  playerName: string;
  playerElement: number;
  opponentTeam: number;
  totalPoints: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  wasHome: boolean;
  gameweek: number;
  minutes: number;
}

export interface HistoricalSeasonData {
  season: string;
  matches: HistoricalMatch[];
}

/**
 * Parse CSV data from historical seasons
 */
export function parseHistoricalCSV(csvText: string, season: string): HistoricalMatch[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const data: HistoricalMatch[] = [];

  // Find column indices
  const getIndex = (col: string) => headers.findIndex(h => h.toLowerCase() === col.toLowerCase());
  
  const indices = {
    name: getIndex('name'),
    element: getIndex('element'),
    opponentTeam: getIndex('opponent_team'),
    totalPoints: getIndex('total_points'),
    goalsScored: getIndex('goals_scored'),
    assists: getIndex('assists'),
    cleanSheets: getIndex('clean_sheets'),
    wasHome: getIndex('was_home'),
    gameweek: getIndex('GW'),
    minutes: getIndex('minutes'),
  };

  // Parse each row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle quoted fields
    const fields = parseCSVLine(line);

    try {
      const match: HistoricalMatch = {
        season,
        playerName: fields[indices.name] || '',
        playerElement: parseInt(fields[indices.element]) || 0,
        opponentTeam: parseInt(fields[indices.opponentTeam]) || 0,
        totalPoints: parseFloat(fields[indices.totalPoints]) || 0,
        goalsScored: parseFloat(fields[indices.goalsScored]) || 0,
        assists: parseFloat(fields[indices.assists]) || 0,
        cleanSheets: parseFloat(fields[indices.cleanSheets]) || 0,
        wasHome: fields[indices.wasHome]?.toLowerCase() === 'true',
        gameweek: parseInt(fields[indices.gameweek]) || 0,
        minutes: parseFloat(fields[indices.minutes]) || 0,
      };

      // Only include matches where player actually played
      if (match.minutes > 0) {
        data.push(match);
      }
    } catch (error) {
      console.error(`Error parsing line ${i}:`, error);
    }
  }

  return data;
}

/**
 * Parse a CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Aggregate historical data by player and opponent
 */
export interface PlayerVsTeamHistorical {
  opponentTeam: number;
  matches: number;
  totalPoints: number;
  avgPoints: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  homeMatches: number;
  awayMatches: number;
  seasons: string[];
}

export function aggregatePlayerVsTeam(
  matches: HistoricalMatch[]
): Map<number, PlayerVsTeamHistorical> {
  const aggregated = new Map<number, PlayerVsTeamHistorical>();

  matches.forEach(match => {
    const existing = aggregated.get(match.opponentTeam);

    if (existing) {
      existing.matches++;
      existing.totalPoints += match.totalPoints;
      existing.goals += match.goalsScored;
      existing.assists += match.assists;
      existing.cleanSheets += match.cleanSheets;
      if (match.wasHome) existing.homeMatches++;
      else existing.awayMatches++;
      if (!existing.seasons.includes(match.season)) {
        existing.seasons.push(match.season);
      }
      existing.avgPoints = existing.totalPoints / existing.matches;
    } else {
      aggregated.set(match.opponentTeam, {
        opponentTeam: match.opponentTeam,
        matches: 1,
        totalPoints: match.totalPoints,
        avgPoints: match.totalPoints,
        goals: match.goalsScored,
        assists: match.assists,
        cleanSheets: match.cleanSheets,
        homeMatches: match.wasHome ? 1 : 0,
        awayMatches: match.wasHome ? 0 : 1,
        seasons: [match.season],
      });
    }
  });

  return aggregated;
}

/**
 * Map current FPL player to historical data
 * Uses player name matching (not perfect but works for most players)
 */
export function findHistoricalMatches(
  playerName: string,
  historicalData: HistoricalSeasonData[]
): HistoricalMatch[] {
  const allMatches: HistoricalMatch[] = [];

  // Normalize player name for matching
  const normalizedSearchName = normalizePlayerName(playerName);

  historicalData.forEach(seasonData => {
    const matches = seasonData.matches.filter(match => {
      const normalizedMatchName = normalizePlayerName(match.playerName);
      return normalizedMatchName === normalizedSearchName;
    });
    allMatches.push(...matches);
  });

  return allMatches;
}

/**
 * Normalize player name for matching
 * Removes special characters, converts to lowercase
 */
function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Load historical data from CSV files
 */
export async function loadHistoricalData(): Promise<HistoricalSeasonData[]> {
  const seasons = [
    { file: '2021-22_gw.csv', season: '2021/22' },
    { file: '2022-23_gw.csv', season: '2022/23' },
    { file: '2023-24_gw.csv', season: '2023/24' },
  ];

  const results: HistoricalSeasonData[] = [];

  for (const { file, season } of seasons) {
    try {
      const response = await fetch(`/historical-data/${file}`);
      if (!response.ok) {
        console.error(`Failed to load ${file}`);
        continue;
      }

      const csvText = await response.text();
      const matches = parseHistoricalCSV(csvText, season);
      
      results.push({
        season,
        matches,
      });

      console.log(`Loaded ${matches.length} matches from ${season}`);
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
    }
  }

  return results;
}

