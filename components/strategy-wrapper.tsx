'use client';

import { useRouter } from 'next/navigation';
import { TeamIdInput } from '@/components/team-id-input';

interface StrategyWrapperProps {
  currentTeamId: number;
}

export function StrategyWrapper({ currentTeamId }: StrategyWrapperProps) {
  const router = useRouter();

  const handleTeamIdChange = (newTeamId: number) => {
    // Force a full page reload to fetch new team data
    window.location.href = `/strategy?teamId=${newTeamId}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <TeamIdInput 
        currentTeamId={currentTeamId}
        onTeamIdChange={handleTeamIdChange}
      />
    </div>
  );
}

