"use client";

import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMarketData } from "@/hooks/use-market-data";
import { cn } from "@/lib/utils";

interface MarketInsightsProps {
    className?: string;
    compact?: boolean;
}

export function MarketInsights({ className, compact = false }: MarketInsightsProps) {
    const { data, isLoading, error, refetch, isFetching } = useMarketData();

    if (error) {
        return (
            <Card className={cn("border-border", className)}>
                <CardContent className="py-6 text-center">
                    <p className="text-muted-foreground mb-3">
                        Unable to load market data
                    </p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (compact) {
        return (
            <div className={cn("flex flex-wrap gap-4", className)}>
                {isLoading ? (
                    <>
                        <CompactMetricSkeleton />
                        <CompactMetricSkeleton />
                        <CompactMetricSkeleton />
                    </>
                ) : (
                    <>
                        <CompactMetric
                            label="CPI Inflation"
                            value={`${data?.inflation.cpi.toFixed(2)}%`}
                            trend={data?.inflation.yoy_change || 0}
                        />
                        <CompactMetric
                            label="Repo Rate"
                            value={`${data?.repo_rate.toFixed(2)}%`}
                        />
                        <CompactMetric
                            label="Gold (10g)"
                            value={`₹${data?.gold.price_per_10g.toLocaleString("en-IN")}`}
                            trend={data?.gold.change_1d || 0}
                        />
                    </>
                )}
            </div>
        );
    }

    return (
        <Card className={cn("border-border bg-card", className)}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Market Context</CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <MetricSkeleton key={i} />
                        ))}
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            label="CPI Inflation"
                            value={`${data?.inflation.cpi.toFixed(2)}%`}
                            subtitle={data?.inflation.month}
                            trend={data?.inflation.yoy_change}
                        />
                        <MetricCard
                            label="Repo Rate"
                            value={`${data?.repo_rate.toFixed(2)}%`}
                            subtitle="RBI"
                        />
                        <MetricCard
                            label="Nifty 50"
                            value={data?.indices.find((i) => i.name === "NIFTY 50")?.value.toLocaleString("en-IN") || "-"}
                            trend={data?.indices.find((i) => i.name === "NIFTY 50")?.change_1d}
                        />
                        <MetricCard
                            label="Gold (10g)"
                            value={`₹${data?.gold.price_per_10g.toLocaleString("en-IN")}`}
                            trend={data?.gold.change_1d}
                        />
                    </div>
                )}
                {data?.last_updated && (
                    <p className="text-[10px] text-muted-foreground mt-4 text-right">
                        Updated: {new Date(data.last_updated).toLocaleString("en-IN")}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

interface MetricCardProps {
    label: string;
    value: string;
    subtitle?: string;
    trend?: number;
}

function MetricCard({ label, value, subtitle, trend }: MetricCardProps) {
    const TrendIcon =
        trend === undefined || trend === 0
            ? Minus
            : trend > 0
                ? TrendingUp
                : TrendingDown;

    const trendColor =
        trend === undefined || trend === 0
            ? "text-muted-foreground"
            : trend > 0
                ? "text-green-400"
                : "text-red-400";

    return (
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <div className="flex items-center justify-between">
                <p className="text-lg font-bold font-mono">{value}</p>
                {trend !== undefined && (
                    <TrendIcon className={cn("h-4 w-4", trendColor)} />
                )}
            </div>
            {subtitle && (
                <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend !== undefined && trend !== 0 && (
                <p className={cn("text-xs font-mono mt-1", trendColor)}>
                    {trend > 0 ? "+" : ""}
                    {trend.toFixed(2)}%
                </p>
            )}
        </div>
    );
}

function CompactMetric({
    label,
    value,
    trend,
}: {
    label: string;
    value: string;
    trend?: number;
}) {
    const trendColor =
        trend === undefined || trend === 0
            ? ""
            : trend > 0
                ? "text-green-400"
                : "text-red-400";

    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn("font-mono font-medium", trendColor)}>{value}</span>
        </div>
    );
}

function MetricSkeleton() {
    return (
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-20" />
        </div>
    );
}

function CompactMetricSkeleton() {
    return <Skeleton className="h-9 w-32 rounded-lg" />;
}