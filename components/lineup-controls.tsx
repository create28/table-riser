
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function LineupControls() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const includeTransfer = searchParams.get('includeTransfer') === 'true';

    const handleToggle = (checked: boolean) => {
        const params = new URLSearchParams(searchParams.toString());
        if (checked) {
            params.set('includeTransfer', 'true');
        } else {
            params.delete('includeTransfer');
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex items-center space-x-2 bg-card p-4 rounded-lg border shadow-sm mb-6">
            <Checkbox
                id="include-transfer"
                checked={includeTransfer}
                onCheckedChange={handleToggle}
            />
            <Label
                htmlFor="include-transfer"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
                Include Suggested Transfer
            </Label>
            <span className="text-xs text-muted-foreground ml-2">
                (Automatically swaps your weakest player for the best available transfer)
            </span>
        </div>
    );
}
