"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    ArrowRight,
    IndianRupee,
    TrendingUp,
    TrendingDown,
    Wallet,
    Calendar,
    Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useMarketSnapshot, useMacroIndicators } from "@/hooks/use-market-data";
import { useTopFDRates } from "@/hooks/use-fd-rates";
import { usePortfolioSummary } from "@/hooks/use-portfolio";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const [amount, setAmount] = useState("");
    const router = useRouter();
    const { user, isGuest, isAuthenticated } = useAuthStore();
    const displayName = user?.name || "there";

    // Fetch real market data
    const { data: marketSnapshot, isLoading: snapshotLoading } = useMarketSnapshot();
    const { data: topFDRates, isLoading: fdLoading } = useTopFDRates(1);
    const { data: macroIndicators, isLoading: macroLoading } = useMacroIndicators();
    const { data: portfolioSummary } = usePortfolioSummary();

    const handleGetSuggestions = () => {
        if (amount && parseFloat(amount) > 0) {
            router.push(`/dashboard/allocate?amount=${amount}`);
        }
    };

    // Derive context values from API data
    const topFD = topFDRates?.[0];
    const inflationIndicator = macroIndicators?.find(
        (i) => i.indicator_name.toLowerCase().includes("inflation") || i.indicator_name.toLowerCase().includes("cpi")
    );

    const isContextLoading = snapshotLoading || fdLoading || macroLoading;

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    Hey {displayName} 👋
                </h1>
                <p className="text-muted-foreground">
                    Let's figure out your monthly investment calmly.
                </p>
            </motion.div>

            {/* Main Input Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <Card className="border-border bg-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            This Month's Investment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <label className="text-sm text-muted-foreground mb-3 block">
                                How much can you invest this month?
                            </label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder="50,000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-10 h-14 text-lg font-mono bg-background border-border"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleGetSuggestions}
                            disabled={!amount || parseFloat(amount) <= 0}
                            className="w-full h-12 bg-primary hover:bg-primary/90"
                        >
                            Get Suggestions
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>

                        {/* Quick amounts */}
                        <div className="flex flex-wrap gap-2">
                            {[10000, 25000, 50000, 100000].map((val) => (
                                <Button
                                    key={val}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAmount(val.toString())}
                                    className="text-xs"
                                >
                                    ₹{val.toLocaleString("en-IN")}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Market Context Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <h2 className="text-lg font-semibold mb-4">Current Context</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Top FD Rate */}
                    {isContextLoading ? (
                        <ContextCardSkeleton />
                    ) : topFD ? (
                        <ContextCard
                            title="Top FD Rate"
                            value={`${topFD.interest_rate_general}%`}
                            subtitle={topFD.bank_name}
                            badge={topFD.tenure_display}
                        />
                    ) : (
                        <ContextCard
                            title="Top FD Rate"
                            value="--"
                            subtitle="No data available"
                        />
                    )}

                    {/* Inflation */}
                    {isContextLoading ? (
                        <ContextCardSkeleton />
                    ) : inflationIndicator ? (
                        <ContextCard
                            title="Inflation (CPI)"
                            value={`${inflationIndicator.value}%`}
                            subtitle={`Change: ${inflationIndicator.change_percent?.toFixed(2) || 0}%`}
                            trend={inflationIndicator.change_percent && inflationIndicator.change_percent < 0 ? "down" : "up"}
                        />
                    ) : marketSnapshot?.inflation_rate ? (
                        <ContextCard
                            title="Inflation"
                            value={`${marketSnapshot.inflation_rate}%`}
                            subtitle="From market snapshot"
                        />
                    ) : (
                        <ContextCard title="Inflation" value="--" subtitle="No data" />
                    )}

                    {/* Gold Price or Nifty PE */}
                    {isContextLoading ? (
                        <ContextCardSkeleton />
                    ) : marketSnapshot?.gold_price_per_gram ? (
                        <ContextCard
                            title="Gold (per gram)"
                            value={`₹${marketSnapshot.gold_price_per_gram.toLocaleString("en-IN")}`}
                            subtitle="24K price"
                        />
                    ) : marketSnapshot?.nifty_pe_ratio ? (
                        <ContextCard
                            title="Nifty PE Ratio"
                            value={marketSnapshot.nifty_pe_ratio.toFixed(1)}
                            subtitle="Valuation metric"
                        />
                    ) : (
                        <ContextCard title="Market Data" value="--" subtitle="No data" />
                    )}
                </div>
            </motion.div>

            {/* Portfolio Summary (if logged in) */}
            {isAuthenticated && !isGuest && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-primary" />
                                Your Holdings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {portfolioSummary && portfolioSummary.total_current_value > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Value</p>
                                            <p className="text-2xl font-bold font-mono">
                                                ₹{portfolioSummary.total_current_value.toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Returns</p>
                                            <div className="flex items-center gap-2">
                                                {portfolioSummary.total_gain_loss >= 0 ? (
                                                    <TrendingUp className="h-4 w-4 text-green-400" />
                                                ) : (
                                                    <TrendingDown className="h-4 w-4 text-red-400" />
                                                )}
                                                <p
                                                    className={cn(
                                                        "text-2xl font-bold font-mono",
                                                        portfolioSummary.total_gain_loss >= 0
                                                            ? "text-green-400"
                                                            : "text-red-400"
                                                    )}
                                                >
                                                    {portfolioSummary.total_gain_loss_percent >= 0 ? "+" : ""}
                                                    {portfolioSummary.total_gain_loss_percent.toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push("/dashboard/portfolio")}
                                        className="w-full"
                                    >
                                        View All Holdings
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p className="mb-4">No holdings added yet</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push("/dashboard/portfolio")}
                                    >
                                        Add Your First Holding
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Guest Banner */}
            {isGuest && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="p-4 rounded-lg bg-secondary/30 border border-border flex items-start gap-3"
                >
                    <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Exploring as guest.</span>{" "}
                        Your suggestions work, but they won't consider your existing holdings.
                        Sign in to get portfolio-aware recommendations that improve over time.
                    </div>
                </motion.div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center pt-4">
                Zrata-X provides educational data for informed decisions. Not investment advice.
            </p>
        </div>
    );
}

function ContextCard({
    title,
    value,
    subtitle,
    badge,
    trend,
}: {
    title: string;
    value: string;
    subtitle: string;
    badge?: string;
    trend?: "up" | "down";
}) {
    return (
        <Card className="border-border bg-card">
            <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{title}</p>
                    {badge && (
                        <Badge variant="secondary" className="text-xs">
                            {badge}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {trend &&
                        (trend === "up" ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                        ))}
                    <p className="text-xl font-bold font-mono">{value}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            </CardContent>
        </Card>
    );
}

function ContextCardSkeleton() {
    return (
        <Card className="border-border bg-card">
            <CardContent className="pt-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-7 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
            </CardContent>
        </Card>
    );
}