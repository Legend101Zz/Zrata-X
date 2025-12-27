/**
 * MarketInsights - Shows key market indicators and opportunities
 * Clean, non-overwhelming display for passive investors
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    TrendingUp, TrendingDown, Minus,
    Landmark, Coins, Newspaper, AlertCircle,
    ArrowUpRight, ArrowDownRight, CreditCard
} from 'lucide-react';
import { FDOpportunityCard } from './FDOpportunityCard';
import { NewsCard } from './NewsCard';
import { useMarketData } from '@/hooks/useMarketData';

interface MarketSnapshot {
    repo_rate: number | null;
    inflation_cpi: number | null;
    gold_price_per_gram: number | null;
    gold_weekly_change_percent: number | null;
    silver_price_per_gram: number | null;
    silver_weekly_change_percent: number | null;
    nifty50_pe_ratio: number | null;
    market_valuation: string | null;
    market_sentiment: {
        overall: string;
        score: number;
        news_count: number;
    };
    fd_rates: {
        best_overall_rate: number | null;
        best_overall_bank: string | null;
        with_credit_card_offer: Array<{ bank: string; rate: number }>;
    };
}

export function MarketInsights() {
    const {
        snapshot,
        fdRates,
        news,
        loading,
        error,
        refetch
    } = useMarketData();

    if (loading) {
        return (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-8">
                    <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
                    </div>
                    <p className="text-center text-slate-500 mt-4">Loading market data...</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-slate-600">Unable to load market data</p>
                    <button
                        onClick={refetch}
                        className="mt-2 text-blue-600 hover:underline text-sm"
                    >
                        Try again
                    </button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    Market Pulse
                    <SentimentBadge sentiment={snapshot?.market_sentiment} />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                        <TabsTrigger value="news">News</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* RBI Repo Rate */}
                            <IndicatorCard
                                icon={<Landmark className="h-4 w-4" />}
                                label="Repo Rate"
                                value={snapshot?.repo_rate}
                                suffix="%"
                                sublabel="RBI Policy Rate"
                            />

                            {/* Inflation */}
                            <IndicatorCard
                                icon={<TrendingUp className="h-4 w-4" />}
                                label="Inflation"
                                value={snapshot?.inflation_cpi}
                                suffix="%"
                                sublabel="CPI YoY"
                                warning={snapshot?.inflation_cpi && snapshot.inflation_cpi > 6}
                            />

                            {/* Gold Price */}
                            <IndicatorCard
                                icon={<Coins className="h-4 w-4 text-amber-500" />}
                                label="Gold"
                                value={snapshot?.gold_price_per_gram}
                                prefix="₹"
                                suffix="/g"
                                change={snapshot?.gold_weekly_change_percent}
                                sublabel="24K"
                            />

                            {/* Silver Price */}
                            <IndicatorCard
                                icon={<Coins className="h-4 w-4 text-slate-400" />}
                                label="Silver"
                                value={snapshot?.silver_price_per_gram}
                                prefix="₹"
                                suffix="/g"
                                change={snapshot?.silver_weekly_change_percent}
                            />
                        </div>

                        {/* Market Valuation */}
                        {snapshot?.market_valuation && (
                            <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                        Market Valuation
                                    </span>
                                    <ValuationBadge valuation={snapshot.market_valuation} />
                                </div>
                                {snapshot.nifty50_pe_ratio && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Nifty 50 P/E: {snapshot.nifty50_pe_ratio.toFixed(1)}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Best FD Highlight */}
                        {snapshot?.fd_rates?.best_overall_rate && (
                            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800">
                                <div className="flex items-center gap-2">
                                    <Landmark className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                        Best FD Rate
                                    </span>
                                </div>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                        {snapshot.fd_rates.best_overall_rate}%
                                    </span>
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        at {snapshot.fd_rates.best_overall_bank}
                                    </span>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Opportunities Tab */}
                    <TabsContent value="opportunities" className="space-y-3">
                        <p className="text-sm text-slate-500 mb-3">
                            Special opportunities based on current market conditions
                        </p>

                        {/* High Yield FDs */}
                        {fdRates && fdRates.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Landmark className="h-4 w-4" />
                                    High-Yield Fixed Deposits
                                </h4>
                                {fdRates.slice(0, 3).map((fd, index) => (
                                    <FDOpportunityCard key={index} fd={fd} />
                                ))}
                            </div>
                        )}

                        {/* FDs with Credit Card */}
                        {snapshot?.fd_rates?.with_credit_card_offer &&
                            snapshot.fd_rates.with_credit_card_offer.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        FD + Credit Card Combo
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        Get a secured credit card against your FD - double benefit!
                                    </p>
                                    {snapshot.fd_rates.with_credit_card_offer.slice(0, 2).map((fd, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800"
                                        >
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                {fd.bank}
                                            </span>
                                            <Badge variant="outline" className="text-green-700 border-green-300">
                                                {fd.rate}% + CC
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}

                        {/* Gold/Silver opportunity */}
                        {snapshot?.gold_weekly_change_percent &&
                            snapshot.gold_weekly_change_percent < -2 && (
                                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                                    <div className="flex items-center gap-2">
                                        <Coins className="h-4 w-4 text-amber-600" />
                                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                            Gold Dip Alert
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        Gold is down {Math.abs(snapshot.gold_weekly_change_percent).toFixed(1)}% this week.
                                        Could be a good time to accumulate.
                                    </p>
                                </div>
                            )}
                    </TabsContent>

                    {/* News Tab */}
                    <TabsContent value="news" className="space-y-3">
                        {news && news.length > 0 ? (
                            <>
                                <p className="text-sm text-slate-500 mb-3">
                                    Recent news affecting your investments
                                </p>
                                {news.slice(0, 5).map((item, index) => (
                                    <NewsCard key={index} news={item} />
                                ))}
                            </>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-4">
                                No recent news available
                            </p>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}


// Sub-components

interface IndicatorCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | null | undefined;
    prefix?: string;
    suffix?: string;
    sublabel?: string;
    change?: number | null;
    warning?: boolean;
}

function IndicatorCard({
    icon,
    label,
    value,
    prefix = '',
    suffix = '',
    sublabel,
    change,
    warning
}: IndicatorCardProps) {
    const formatValue = (val: number) => {
        if (val >= 10000) {
            return val.toLocaleString('en-IN');
        }
        return val.toFixed(val < 100 ? 2 : 0);
    };

    return (
        <div className={`p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 ${warning ? 'ring-1 ring-amber-300' : ''
            }`}>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                {icon}
                <span className="text-xs">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {value !== null && value !== undefined ? (
                        `${prefix}${formatValue(value)}${suffix}`
                    ) : (
                        <span className="text-slate-400">--</span>
                    )}
                </span>
                {change !== null && change !== undefined && (
                    <span className={`text-xs flex items-center ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                        {change > 0 ? <ArrowUpRight className="h-3 w-3" /> :
                            change < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {Math.abs(change).toFixed(1)}%
                    </span>
                )}
            </div>
            {sublabel && (
                <span className="text-xs text-slate-400">{sublabel}</span>
            )}
        </div>
    );
}


function SentimentBadge({ sentiment }: { sentiment?: { overall: string; score: number } }) {
    if (!sentiment) return null;

    const config = {
        bullish: { color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: TrendingUp },
        bearish: { color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: TrendingDown },
        neutral: { color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', icon: Minus },
    };

    const { color, icon: Icon } = config[sentiment.overall as keyof typeof config] || config.neutral;

    return (
        <Badge className={`${color} text-xs font-normal`}>
            <Icon className="h-3 w-3 mr-1" />
            {sentiment.overall}
        </Badge>
    );
}


function ValuationBadge({ valuation }: { valuation: string }) {
    const config = {
        undervalued: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        fair: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        overvalued: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    };

    return (
        <Badge className={config[valuation as keyof typeof config] || config.fair}>
            {valuation}
        </Badge>
    );
}