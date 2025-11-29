import { Suspense } from 'react';
import {
    fetchBootstrapStatic,
    fetchFixtures,
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

        return {
            teams: bootstrapData.teams,
            allPlayers: bootstrapData.elements,
            fixtures,
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
                    teams={data.teams}
                    fixtures={data.fixtures}
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
