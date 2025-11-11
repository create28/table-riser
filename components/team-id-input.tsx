'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TeamIdInputProps {
  currentTeamId: number;
  onTeamIdChange: (teamId: number) => void;
}

export function TeamIdInput({ currentTeamId, onTeamIdChange }: TeamIdInputProps) {
  const [inputValue, setInputValue] = useState(currentTeamId.toString());
  const [error, setError] = useState('');

  useEffect(() => {
    setInputValue(currentTeamId.toString());
  }, [currentTeamId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const teamId = parseInt(inputValue);
    
    // Validation
    if (isNaN(teamId)) {
      setError('Please enter a valid team ID (numbers only)');
      return;
    }
    
    if (teamId < 1 || teamId > 10000000) {
      setError('Team ID must be between 1 and 10,000,000');
      return;
    }
    
    setError('');
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('fpl_team_id', teamId.toString());
    }
    
    onTeamIdChange(teamId);
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="teamId" className="text-sm font-medium mb-1 block">
              FPL Team ID
            </label>
            <input
              id="teamId"
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError('');
              }}
              placeholder="Enter team ID (e.g., 3992229)"
              className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            />
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
            )}
          </div>
          
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">
              Load Team
            </Button>
          </div>
        </form>
        
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Tip:</strong> Find your team ID in your FPL URL: fantasy.premierleague.com/entry/<strong>XXXXXX</strong>/</p>
          <p>👤 Currently viewing team: <span className="font-mono font-semibold text-primary">{currentTeamId}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}

