// FPL API Service
const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export interface Player {
  id: number;
  code: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  team_code: number;
  element_type: number;
  now_cost: number;
  form: string;
  points_per_game: string;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  bonus: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  selected_by_percent: string;
  transfers_in_event: number;
  transfers_out_event: number;
  event_points: number;
  // Defensive & disciplinary stats
  saves?: number;
  penalties_saved?: number;
  penalties_missed?: number;
  yellow_cards?: number;
  red_cards?: number;
  own_goals?: number;
  bps?: number;
  // Advanced metrics
  expected_goals?: string;
  expected_assists?: string;
  expected_goal_involvements?: string;
  expected_goals_conceded?: string;
  // Injury/availability
  chance_of_playing_next_round?: number | null;
  chance_of_playing_this_round?: number | null;
  news?: string;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface ManagerTeam {
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
  chips: any[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    overall_rank: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
  };
}

export interface Fixture {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  finished: boolean;
  team_h_score: number | null;
  team_a_score: number | null;
}

export interface BootstrapStatic {
  events: Array<{
    id: number;
    name: string;
    deadline_time: string;
    finished: boolean;
    is_current: boolean;
    is_next: boolean;
  }>;
  teams: Team[];
  elements: Player[];
  element_types: Array<{
    id: number;
    singular_name: string;
    singular_name_short: string;
    plural_name: string;
    plural_name_short: string;
  }>;
}

// Fetch general game data (players, teams, etc.)
export async function fetchBootstrapStatic(): Promise<BootstrapStatic> {
  const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
  if (!response.ok) throw new Error('Failed to fetch bootstrap data');
  return response.json();
}

// Fetch manager's team for a specific gameweek
export async function fetchManagerTeam(teamId: number, gameweek: number): Promise<ManagerTeam> {
  const response = await fetch(`${FPL_BASE_URL}/entry/${teamId}/event/${gameweek}/picks/`);
  if (!response.ok) throw new Error('Failed to fetch manager team');
  return response.json();
}

// Fetch manager's general info
export async function fetchManagerInfo(teamId: number) {
  const response = await fetch(`${FPL_BASE_URL}/entry/${teamId}/`);
  if (!response.ok) throw new Error('Failed to fetch manager info');
  return response.json();
}

// Fetch player's detailed history
export async function fetchPlayerHistory(playerId: number) {
  const response = await fetch(`${FPL_BASE_URL}/element-summary/${playerId}/`);
  if (!response.ok) throw new Error('Failed to fetch player history');
  return response.json();
}

// Fetch fixtures
export async function fetchFixtures(): Promise<Fixture[]> {
  const response = await fetch(`${FPL_BASE_URL}/fixtures/`);
  if (!response.ok) throw new Error('Failed to fetch fixtures');
  return response.json();
}

// Helper function to get current gameweek
export function getCurrentGameweek(events: BootstrapStatic['events']): number {
  const currentEvent = events.find(e => e.is_current);
  return currentEvent?.id || events.length;
}

// Helper function to calculate value per point
export function calculateValuePerPoint(points: number, cost: number): number {
  if (points === 0) return 0;
  return (cost / 10) / points;
}

// Helper function to calculate transfer coefficient
export function calculateTransferCoefficient(
  transfersIn: number,
  transfersOut: number,
  selectedPercent: number
): number {
  const netTransfers = transfersIn - transfersOut;
  return (netTransfers / 1000) * (1 + selectedPercent / 100);
}

