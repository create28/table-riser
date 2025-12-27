'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeamIdInput } from '@/components/team-id-input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardWrapperProps {
  initialTeamId: number;
  children: React.ReactNode;
  managerInfo?: any;
  entryHistory?: any;
}

export function DashboardWrapper({ initialTeamId, children, managerInfo, entryHistory }: DashboardWrapperProps) {
  const router = useRouter();
  const [currentTeamId, setCurrentTeamId] = useState(initialTeamId);

  const handleTeamIdChange = (newTeamId: number) => {
    setCurrentTeamId(newTeamId);
    // Force a full page reload to fetch new team data
    window.location.href = `/?teamId=${newTeamId}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-stone-900 dark:via-amber-950 dark:to-orange-950">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-6">
          <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-amber-700 via-orange-600 to-rose-600 bg-clip-text text-transparent">
            FPL Dashboard
          </h1>

          {/* Top Row: Team ID Input & Manager Info */}
          <div className="flex flex-col md:flex-row gap-6 items-start justify-center max-w-5xl mx-auto">

            {/* Left: Team ID Input */}
            <div className="w-full md:w-1/3 bg-white/50 dark:bg-black/20 p-6 rounded-xl border shadow-sm backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 text-center">Manage Team</h3>
              <TeamIdInput
                currentTeamId={currentTeamId}
                onTeamIdChange={handleTeamIdChange}
              />
            </div>

            {/* Right: Manager Info */}
            {managerInfo && entryHistory && (
              <div className="w-full md:w-2/3 bg-white/50 dark:bg-black/20 p-6 rounded-xl border shadow-sm backdrop-blur-sm flex flex-col justify-center min-h-[160px]">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{managerInfo.name}</h2>
                    <p className="text-muted-foreground">{managerInfo.player_first_name} {managerInfo.player_last_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/training">
                      <Button variant="outline" size="sm" className="gap-2">
                        <span className="text-lg">🧠</span>
                        Training
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-2 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Rank</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-500">
                      {entryHistory.overall_rank?.toLocaleString() ?? '-'}
                    </p>
                  </div>
                  <div className="p-2 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Points</p>
                    <p className="text-xl font-bold text-orange-700 dark:text-orange-500">
                      {entryHistory.total_points}
                    </p>
                  </div>
                  <div className="p-2 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">GW Points</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-500">
                      {entryHistory.points}
                    </p>
                  </div>
                  <div className="p-2 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Team Value</p>
                    <p className="text-xl font-bold text-rose-700 dark:text-rose-500">
                      £{(entryHistory.value / 10).toFixed(1)}m
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Content */}
        {children}
      </div>
    </main>
  );
}

