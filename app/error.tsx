'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle className="text-red-600">Something went wrong!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                        {error.message || 'An unexpected error occurred while fetching data.'}
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => reset()}>Try again</Button>
                        <Button variant="outline" onClick={() => window.location.href = '/'}>
                            Go Home
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
