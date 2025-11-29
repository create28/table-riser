import { fetchScoutReports, analyzeScoutReports } from '@/lib/rss';
import { ScoutReports } from '@/components/scout-reports';
import { Player } from '@/lib/fpl-api';

interface ScoutReportsWrapperProps {
    allPlayers: Player[];
}

export async function ScoutReportsWrapper({ allPlayers }: ScoutReportsWrapperProps) {
    let scoutReports: any[] = [];
    let playerMentions: any[] = [];

    try {
        scoutReports = await fetchScoutReports();
        playerMentions = analyzeScoutReports(scoutReports, allPlayers);
    } catch (error) {
        console.error('Failed to fetch/analyze scout reports:', error);
        // Fallback to empty arrays
    }

    return <ScoutReports reports={scoutReports} mentions={playerMentions} />;
}
