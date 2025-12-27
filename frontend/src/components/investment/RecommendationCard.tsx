/**
 * Individual recommendation card with action buttons.
 */
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ExternalLink, Star } from 'lucide-react';

interface Suggestion {
    asset_type: string;
    instrument_name: string;
    instrument_id: string;
    amount: number;
    percentage: number;
    reason: string;
    highlight?: string;
    current_rate?: number;
}

interface Props {
    suggestion: Suggestion;
}

const assetIcons: Record<string, string> = {
    mutual_fund: '📊',
    fd: '🏦',
    gold: '🥇',
    silver: '🥈',
    etf: '📈',
    bond: '📜',
};

const assetColors: Record<string, string> = {
    mutual_fund: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    fd: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    gold: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    silver: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    etf: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

export function RecommendationCard({ suggestion }: Props) {
    const [invested, setInvested] = useState(false);

    const formatCurrency = (amount: number): string => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const handleInvest = async () => {
        // In production, this would open the investment flow or external link
        setInvested(true);

        // Record in backend
        try {
            await fetch('/api/v1/portfolio/holdings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: 1, // Get from auth
                    asset_type: suggestion.asset_type,
                    asset_identifier: suggestion.instrument_id,
                    asset_name: suggestion.instrument_name,
                    invested_amount: suggestion.amount,
                    purchase_date: new Date().toISOString(),
                }),
            });
        } catch (error) {
            console.error('Failed to record investment:', error);
        }
    };

    return (
        <Card className={`border-l-4 ${invested ? 'border-l-green-500 bg-green-50/50' : 'border-l-blue-500'}`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1space-y-2">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg">
                                {assetIcons[suggestion.asset_type] || '💰'}
                            </span>
                            <Badge className={assetColors[suggestion.asset_type] || 'bg-slate-100'}>
                                {suggestion.asset_type.replace(/_/g, ' ')}
                            </Badge>
                            {suggestion.highlight && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                    <Star className="h-3 w-3 mr-1 fill-amber-400" />
                                    {suggestion.highlight}
                                </Badge>
                            )}
                        </div>{/* Instrument name */}
                        <h4 className="font-medium text-slate-800 dark:text-slate-200">
                            {suggestion.instrument_name}
                        </h4>

                        {/* Amount and percentage */}
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                {formatCurrency(suggestion.amount)}
                            </span>
                            <span className="text-sm text-slate-500">
                                ({suggestion.percentage.toFixed(0)}%)
                            </span>
                            {suggestion.current_rate && (
                                <span className="text-sm text-green-600 font-medium">
                                    @ {suggestion.current_rate}% p.a.
                                </span>
                            )}
                        </div>

                        {/* Reason */}
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {suggestion.reason}
                        </p>
                    </div>

                    {/* Action */}
                    <div className="flex flex-col gap-2">
                        {invested ? (
                            <Button disabled variant="outline" className="text-green-600">
                                <Check className="h-4 w-4 mr-1" />
                                Added
                            </Button>
                        ) : (
                            <Button onClick={handleInvest} size="sm">
                                Invest
                                <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>);
}