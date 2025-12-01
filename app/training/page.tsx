import { Suspense } from 'react';
import {
    fetchBootstrapStatic,
    fetchFixtures,
    fetchPlayerHistory,
    Player
} from '@/lib/fpl-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingDashboard } from '@/components/training-dashboard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

async function getTrainingData() {
    try {
        const [bootstrapData, fixtures] = await Promise.all([
            fetchBootstrapStatic(),
            fetchFixtures(),
        ]);

        // Fetch history for top 50 players by points (for simulation market)
        const topPlayers = [...bootstrapData.elements]
            .sort((a, b) => b.total_points - a.total_points)
            .slice(0, 50);

        const playerHistories: { [key: number]: any } = {};

        // Fetch in parallel batches
        const batchSize = 10;
        for (let i = 0; i < topPlayers.length; i += batchSize) {
            const batch = topPlayers.slice(i, i + batchSize);
            await Promise.all(
                batch.map(async (p) => {
                    try {
                        const history = await fetchPlayerHistory(p.id);
                        playerHistories[p.id] = history;
                    } catch (e) {
                        console.error(`Failed to fetch history for ${p.web_name}`, e);
                    }
                })
            );
        }

        return {
            teams: bootstrapData.teams,
            allPlayers: bootstrapData.elements,
            fixtures,
            playerHistories
        };
    } catch (error) {
        console.error('Error fetching training data:', error);
        throw error;
    }
}

export default async function TrainingPage() {
    const data = await getTrainingData();

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/" className="p-2 hover:bg-accent rounded-full transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">ML Training Center</h1>
                    <p className="text-muted-foreground">Train the transfer algorithm using historical data simulations</p>
                </div>
            </div>

            <Suspense fallback={<LoadingCard />}>
                <TrainingDashboard
                    allPlayers={data.allPlayers}
                    fixtures={data.fixtures}
                    playerHistories={data.playerHistories}
                />
            </Suspense>
        </div>
    );
}

function LoadingCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Loading Training Data...</CardTitle>
                <CardDescription>Fetching player and fixture data</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </CardContent>
        </Card>
    );
}
