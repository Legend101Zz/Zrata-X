/**
 * Portfolio Snapshot - Visual representation without number overload.
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Allocation {
    name: string;
    value: number;
    color: string;
}

const COLORS = {
    equity: '#3B82F6',     // Blue
    debt: '#10B981',       // Green
    gold: '#F59E0B',       // Amber
    fd: '#8B5CF6',         // Purple
    silver: '#6B7280',     // Gray
    other: '#EC4899',      // Pink
};

export function PortfolioSnapshot() {
    const [allocation, setAllocation] = useState<Allocation[]>([]);
    const [summary, setSummary] = useState({
        totalValue: 0,
        gainLoss: 0,
        gainLossPercent: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPortfolioData();
    }, []);

    const fetchPortfolioData = async () => {
        try {
            const res = await fetch('/api/v1/portfolio/summary?user_id=1');
            const data = await res.json();

            // Transform allocation data
            const allocationData = Object.entries(data.allocation).map(([key, val]: [string, any]) => ({
                name: formatAssetName(key),
                value: val.percent,
                color: COLORS[key as keyof typeof COLORS] || COLORS.other,
            }));

            setAllocation(allocationData);
            setSummary({
                totalValue: data.total_current_value,
                gainLoss: data.total_gain_loss,
                gainLossPercent: data.total_gain_loss_percent,
            });
        } catch (error) {
            console.error('Failed to fetch portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatAssetName = (name: string): string => {
        const names: Record<string, string> = {
            equity: 'Equity',
            debt: 'Debt',
            gold: 'Gold',
            silver: 'Silver',
            fd: 'Fixed Deposits',
            mutual_fund: 'Mutual Funds',
            etf: 'ETFs',
        };
        return names[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatCurrency = (amount: number): string => {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)} L`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    if (loading) {
        return <div className="h-64 animate-pulse bg-slate-200 rounded-2xl" />;
    }

    return (
        <Card className="overflow-hidden border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-slate-700 dark:text-slate-200">
                    Your Portfolio
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Pie Chart */}
                    <div className="w-48 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={allocation}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {allocation.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Allocation']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Summary */}
                    <div className="flex-1 space-y-4">
                        {/* Total Value */}
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Value</p>
                            <p className="text-3xl font-semibold text-slate-800 dark:text-slate-100">
                                {formatCurrency(summary.totalValue)}
                            </p>
                        </div>

                        {/* Gain/Loss */}
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Overall Returns</p>
                            <p className={`text-xl font-medium ${summary.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {summary.gainLoss >= 0 ? '+' : ''}{formatCurrency(summary.gainLoss)}
                                <span className="text-sm ml-2">
                                    ({summary.gainLossPercent >= 0 ? '+' : ''}{summary.gainLossPercent.toFixed(2)}%)
                                </span>
                            </p>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 pt-2">
                            {allocation.map((item) => (
                                <div key={item.name} className="flex items-center gap-1.5">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-xs text-slate-600 dark:text-slate-300">
                                        {item.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}