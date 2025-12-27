"use client";

import { PieChart, Wallet, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioSummary, useHoldings } from "@/hooks/use-portfolio";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

interface PortfolioSnapshotProps {
    className?: string;
    onAddHolding?: () => void;
}

export function PortfolioSnapshot({
    className,
    onAddHolding,
}: PortfolioSnapshotProps) {
    const { isAuthenticated, isGuest } = useAuthStore();
    const { data: summary, isLoading: summaryLoading } = usePortfolioSummary();
    const { data: holdings, isLoading: holdingsLoading } = useHoldings();

    const isLoading = summaryLoading || holdingsLoading;

    // Guest state
    if (isGuest || !isAuthenticated) {
        return (
            <Card className={cn("border-border bg-card", className)}>
                <CardContent className="py-8 text-center">
                    <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-2">Track Your Portfolio</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Sign in to add your holdings and get portfolio-aware suggestions.
                    </p>
                    <Button variant="outline" size="sm">
                        Sign in to continue
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <Card className={cn("border-border bg-card", className)}>
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Empty state
    if (!holdings || holdings.length === 0) {
        return (
            <Card className={cn("border-border bg-card border-dashed", className)}>
                <CardContent className="py-8 text-center">
                    <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-2">No holdings yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Add your existing investments to get better suggestions.
                    </p>
                    <Button onClick={onAddHolding}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add your first holding
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const isPositive = (summary?.returns_percentage || 0) >= 0;

    return (
        <Card className={cn("border-border bg-card", className)}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Portfolio Snapshot
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={onAddHolding}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Total Value */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                    <p className="text-3xl font-bold font-mono">
                        ₹{(summary?.total_value || 0).toLocaleString("en-IN")}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        {isPositive ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                        <span
                            className={cn(
                                "text-sm font-mono",
                                isPositive ? "text-green-400" : "text-red-400"
                            )}
                        >
                            {isPositive ? "+" : ""}
                            {summary?.returns_percentage?.toFixed(2)}% (₹
                            {Math.abs(summary?.total_returns || 0).toLocaleString("en-IN")})
                        </span>
                    </div>
                </div>

                {/* Allocation Breakdown */}
                {summary?.allocation && summary.allocation.length > 0 && (
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">Allocation</p>
                        <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
                            {summary.allocation.map((cat, i) => (
                                <div
                                    key={cat.category}
                                    className={cn("h-full", getAllocationColor(i))}
                                    style={{ width: `${cat.percentage}%` }}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3">
                            {summary.allocation.map((cat, i) => (
                                <div key={cat.category} className="flex items-center gap-1.5">
                                    <div
                                        className={cn("h-2.5 w-2.5 rounded", getAllocationColor(i))}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {cat.category}
                                    </span>
                                    <span className="text-xs font-mono">
                                        {cat.percentage.toFixed(0)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <p className="text-xs text-muted-foreground">Holdings</p>
                        <p className="text-lg font-bold">{summary?.holdings_count || 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <p className="text-xs text-muted-foreground">Invested</p>
                        <p className="text-lg font-bold font-mono">
                            ₹{((summary?.total_invested || 0) / 100000).toFixed(1)}L
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function getAllocationColor(index: number): string {
    const colors = [
        "bg-blue-500",
        "bg-green-500",
        "bg-yellow-500",
        "bg-purple-500",
        "bg-orange-500",
        "bg-teal-500",
        "bg-pink-500",
        "bg-indigo-500",
    ];
    return colors[index % colors.length];
}