'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Team, Fixture } from '@/lib/fpl-api';

interface FixtureDifficultyProps {
  teams: Team[];
  fixtures: Fixture[];
  playerTeams: number[];
}

export function FixtureDifficulty({ teams, fixtures, playerTeams }: FixtureDifficultyProps) {
  // Get next 5 fixtures for each team
  const getUpcomingFixtures = (teamId: number) => {
    return fixtures
      .filter(f => (f.team_h === teamId || f.team_a === teamId) && !f.finished)
      .sort((a, b) => a.event - b.event)
      .slice(0, 5);
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-lime-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-orange-500';
      case 5: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'Very Easy';
      case 2: return 'Easy';
      case 3: return 'Medium';
      case 4: return 'Hard';
      case 5: return 'Very Hard';
      default: return 'Unknown';
    }
  };

  // Calculate average difficulty for all teams
  const teamDifficulties = teams.map(team => {
    const upcoming = getUpcomingFixtures(team.id);
    if (upcoming.length === 0) return { team, avgDifficulty: 5, upcoming: [] };

    const avgDifficulty = upcoming.reduce((sum, fixture) => {
      const isHome = fixture.team_h === team.id;
      return sum + (isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty);
    }, 0) / upcoming.length;

    return { team, avgDifficulty, upcoming };
  });

  // Sort by easiest fixtures (lowest difficulty) and take top 5
  const topTeams = teamDifficulties
    .sort((a, b) => a.avgDifficulty - b.avgDifficulty)
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Best Upcoming Fixtures</CardTitle>
        <CardDescription>Top 5 teams to target for next 5 gameweeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topTeams.map(({ team, avgDifficulty, upcoming }) => (
            <div key={team.id} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{team.name}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Diff: {avgDifficulty.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {upcoming.map((fixture) => {
                  const isHome = fixture.team_h === team.id;
                  const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
                  const opponent = teams.find(t => t.id === (isHome ? fixture.team_a : fixture.team_h));

                  return (
                    <div
                      key={fixture.id}
                      className={`px-2 py-1 rounded text-white text-[10px] font-medium ${getDifficultyColor(difficulty)} min-w-[3.5rem] text-center`}
                      title={`${getDifficultyLabel(difficulty)} - GW${fixture.event}`}
                    >
                      <div className="font-bold">{opponent?.short_name || 'TBD'} ({isHome ? 'H' : 'A'})</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


