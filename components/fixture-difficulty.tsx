'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Team, Fixture } from '@/lib/fpl-api';

interface FixtureDifficultyProps {
  teams: Team[];
  fixtures: Fixture[];
  playerTeams: number[];
}

export function FixtureDifficulty({ teams, fixtures, playerTeams }: FixtureDifficultyProps) {
  const uniqueTeamIds = Array.from(new Set(playerTeams));

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Fixture Difficulty</CardTitle>
        <CardDescription>Next 5 fixtures for your players&apos; teams</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {uniqueTeamIds.map(teamId => {
            const team = teams.find(t => t.id === teamId);
            if (!team) return null;

            const upcomingFixtures = getUpcomingFixtures(teamId);
            
            if (upcomingFixtures.length === 0) return null;

            const avgDifficulty = upcomingFixtures.reduce((sum, fixture) => {
              const isHome = fixture.team_h === teamId;
              return sum + (isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty);
            }, 0) / upcomingFixtures.length;

            return (
              <div key={teamId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Avg Difficulty: {avgDifficulty.toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {upcomingFixtures.map((fixture) => {
                    const isHome = fixture.team_h === teamId;
                    const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
                    const opponent = teams.find(t => t.id === (isHome ? fixture.team_a : fixture.team_h));

                    return (
                      <div
                        key={fixture.id}
                        className={`px-3 py-2 rounded text-white text-xs font-medium ${getDifficultyColor(difficulty)}`}
                        title={`${getDifficultyLabel(difficulty)} - GW${fixture.event}`}
                      >
                        <div className="text-center">
                          <div className="font-bold">{isHome ? 'H' : 'A'}</div>
                          <div>{opponent?.short_name || 'TBD'}</div>
                          <div className="text-[10px] opacity-80">GW{fixture.event}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


