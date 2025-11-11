'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeamIdInput } from '@/components/team-id-input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardWrapperProps {
  initialTeamId: number;
  children: React.ReactNode;
}

export function DashboardWrapper({ initialTeamId, children }: DashboardWrapperProps) {
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
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-rose-600 bg-clip-text text-transparent">
            FPL Dashboard
          </h1>
          
          {/* Navigation */}
          <div className="flex justify-center gap-3">
            <Link href={`/strategy?teamId=${currentTeamId}`}>
              <Button variant="outline" className="gap-2">
                <span className="text-lg">🎯</span>
                5-Week Transfer Strategy
              </Button>
            </Link>
          </div>

          {/* Team ID Input */}
          <div className="max-w-2xl mx-auto">
            <TeamIdInput 
              currentTeamId={currentTeamId}
              onTeamIdChange={handleTeamIdChange}
            />
          </div>
        </div>

        {/* Dashboard Content */}
        {children}
      </div>
    </main>
  );
}

