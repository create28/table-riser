'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Team, Fixture } from '@/lib/fpl-api';

interface TeamFormProps {
  teams: Team[];
  fixtures: Fixture[];
  playerTeams: number[];
}

export function TeamForm({ teams, fixtures, playerTeams }: TeamFormProps) {
  // Get unique team IDs from player teams
  const uniqueTeamIds = Array.from(new Set(playerTeams));

  // Get last 5 fixtures for each team
  const getTeamForm = (teamId: number) => {
    const teamFixtures = fixtures
      .filter(f => (f.team_h === teamId || f.team_a === teamId) && f.finished)
      .sort((a, b) => b.event - a.event)
      .slice(0, 5);

    return teamFixtures.map(fixture => {
      const isHome = fixture.team_h === teamId;
      const teamScore = isHome ? fixture.team_h_score : fixture.team_a_score;
      const opponentScore = isHome ? fixture.team_a_score : fixture.team_h_score;

      if (teamScore === null || opponentScore === null) return 'N/A';
      
      if (teamScore > opponentScore) return 'W';
      if (teamScore < opponentScore) return 'L';
      return 'D';
    });
  };

  const getFormColor = (result: string) => {
    switch (result) {
      case 'W': return 'bg-green-500';
      case 'D': return 'bg-yellow-500';
      case 'L': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Team Form</CardTitle>
        <CardDescription>Last 5 matches for your players&apos; teams</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {uniqueTeamIds.map(teamId => {
            const team = teams.find(t => t.id === teamId);
            if (!team) return null;

            const form = getTeamForm(teamId);
            const wins = form.filter(r => r === 'W').length;
            const draws = form.filter(r => r === 'D').length;
            const losses = form.filter(r => r === 'L').length;

            return (
              <div key={teamId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold">{team.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {wins}W {draws}D {losses}L
                  </p>
                </div>
                <div className="flex gap-1">
                  {form.reverse().map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold ${getFormColor(result)}`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

