"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, IndianRupee, Wallet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { useMarketSnapshot, useMacroIndicators } from "@/hooks/use-market-data";
import { useTopFDRates } from "@/hooks/use-fd-rates";
import { usePortfolioSummary } from "@/hooks/use-portfolio";
import { useActiveSignals } from "@/hooks/use-signals";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const [amount, setAmount] = useState("");
    const router = useRouter();
    const { user, isGuest, isAuthenticated } = useAuthStore();
    const displayName = user?.name?.split(" ")[0] || "there";

    const { data: marketSnapshot, isLoading: snapshotLoading } = useMarketSnapshot();
    const { data: topFDRates, isLoading: fdLoading } = useTopFDRates(1);
    const { data: macroIndicators } = useMacroIndicators();
    const { data: portfolioSummary } = usePortfolioSummary();
    const { data: signals } = useActiveSignals();

    const topFD = topFDRates?.[0];
    const isContextLoading = snapshotLoading || fdLoading;

    const handleGetPlan = () => {
        const parsed = parseFloat(amount.replace(/,/g, ""));
        if (parsed > 0) {
            router.push(`/dashboard/plan?amount=${parsed}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleGetPlan();
    };

    // Format the amount input with commas
    const handleAmountChange = (val: string) => {
        const clean = val.replace(/[^0-9]/g, "");
        if (clean === "") {
            setAmount("");
            return;
        }
        const num = parseInt(clean, 10);
        setAmount(num.toLocaleString("en-IN"));
    };

    // Pull a few signals for the context strip
    const topSignals = signals?.slice(0, 3) || [];

    return (
        <div className="space-y-10">
            {/* ── Greeting ── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1
                    className="text-2xl md:text-3xl font-light mb-1"
                    style={{ fontFamily: "var(--font-serif)" }}
                >
                    Hey {displayName}
                </h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Let's figure out this month's investment.
                </p>
            </motion.div>

            {/* ── THE INPUT — the core of the product ── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 md:p-8"
            >
                <label
                    className="block text-sm text-[hsl(var(--muted-foreground))] mb-4"
                    style={{ fontFamily: "var(--font-serif)" }}
                >
                    How much can you invest this month?
                </label>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">
                            ₹
                        </span>
                        <Input
                            type="text"
                            inputMode="numeric"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="50,000"
                            className={cn(
                                "pl-8 h-12 text-xl tabular-nums font-light",
                                "bg-[hsl(var(--background))] border-[hsl(var(--border))]",
                                "placeholder:text-[hsl(var(--muted-foreground)/0.3)]",
                                "focus:border-[hsl(var(--primary)/0.5)] focus:ring-1 focus:ring-[hsl(var(--primary)/0.2)]"
                            )}
                        />
                    </div>
                    <Button
                        onClick={handleGetPlan}
                        disabled={!amount || parseFloat(amount.replace(/,/g, "")) <= 0}
                        className={cn(
                            "h-12 px-6",
                            "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
                            "hover:bg-[hsl(38_92%_55%)]",
                            "disabled:opacity-30"
                        )}
                    >
                        Get plan
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </motion.div>

            {/* ── Market Context Strip ── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
                <ContextCard
                    label="Best FD"
                    value={topFD ? `${topFD.interest_rate_general}%` : "—"}
                    detail={topFD?.bank_name || ""}
                    loading={isContextLoading}
                />
                <ContextCard
                    label="Gold / g"
                    value={
                        marketSnapshot?.gold_price_per_gram
                            ? `₹${marketSnapshot.gold_price_per_gram.toLocaleString("en-IN")}`
                            : "—"
                    }
                    loading={isContextLoading}
                />
                <ContextCard
                    label="Repo Rate"
                    value={
                        marketSnapshot?.repo_rate
                            ? `${marketSnapshot.repo_rate}%`
                            : "—"
                    }
                    loading={isContextLoading}
                />
                <ContextCard
                    label="Sentiment"
                    value={marketSnapshot?.market_sentiment || "—"}
                    variant={
                        marketSnapshot?.market_sentiment === "bullish"
                            ? "positive"
                            : marketSnapshot?.market_sentiment === "bearish"
                                ? "negative"
                                : "neutral"
                    }
                    loading={isContextLoading}
                />
            </motion.div>

            {/* ── Active Signals (top 3) ── */}
            {topSignals.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Market signals Zrata-X is watching
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 text-[hsl(var(--primary))]"
                            onClick={() => router.push("/dashboard/signals")}
                        >
                            See all
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {topSignals.map((sig, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] px-4 py-2.5"
                            >
                                <span
                                    className={cn(
                                        "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
                                        sig.direction === "bullish" &&
                                        "bg-[hsl(var(--gain)/0.1)] text-[hsl(var(--gain))]",
                                        sig.direction === "bearish" &&
                                        "bg-[hsl(var(--loss)/0.1)] text-[hsl(var(--loss))]",
                                        sig.direction === "neutral" &&
                                        "bg-[hsl(var(--signal-neutral)/0.1)] text-[hsl(var(--signal-neutral))]"
                                    )}
                                >
                                    {sig.direction}
                                </span>
                                <p className="text-sm text-[hsl(var(--foreground)/0.8)] flex-1">
                                    {sig.reasoning}
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ── Portfolio Snapshot ── */}
            {isAuthenticated && portfolioSummary && portfolioSummary.total_invested > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Your portfolio
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => router.push("/dashboard/portfolio")}
                        >
                            View all
                        </Button>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-2xl font-light tabular-nums" style={{ fontFamily: "var(--font-serif)" }}>
                                ₹{portfolioSummary.total_current_value.toLocaleString("en-IN")}
                            </p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                Invested: ₹{portfolioSummary.total_invested.toLocaleString("en-IN")}
                            </p>
                        </div>
                        <p
                            className={cn(
                                "text-sm tabular-nums font-medium",
                                portfolioSummary.total_gain_loss_percent >= 0
                                    ? "text-[hsl(var(--gain))]"
                                    : "text-[hsl(var(--loss))]"
                            )}
                        >
                            {portfolioSummary.total_gain_loss_percent >= 0 ? "+" : ""}
                            {portfolioSummary.total_gain_loss_percent.toFixed(1)}%
                        </p>
                    </div>
                </motion.div>
            )}

            {/* ── Guest nudge ── */}
            {isGuest && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-start gap-3 text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary)/0.5)] rounded-lg px-4 py-3 border border-[hsl(var(--border))]"
                >
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(var(--primary)/0.6)]" />
                    <span>
                        Exploring as guest. Suggestions work, but won't account for your existing holdings.
                    </span>
                </motion.div>
            )}

            <p className="text-[10px] text-[hsl(var(--muted-foreground)/0.4)] text-center">
                For educational purposes. Not investment advice.
            </p>
        </div>
    );
}

/* ── Context Card ── */
function ContextCard({
    label,
    value,
    detail,
    loading,
    variant = "neutral",
}: {
    label: string;
    value: string;
    detail?: string;
    loading?: boolean;
    variant?: "positive" | "negative" | "neutral";
}) {
    if (loading) {
        return (
            <div className="rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3">
                <Skeleton className="h-3 w-12 mb-2" />
                <Skeleton className="h-5 w-16" />
            </div>
        );
    }

    return (
        <div className="rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3">
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wider">
                {label}
            </p>
            <p
                className={cn(
                    "text-sm font-medium tabular-nums",
                    variant === "positive" && "text-[hsl(var(--gain))]",
                    variant === "negative" && "text-[hsl(var(--loss))]"
                )}
            >
                {value}
            </p>
            {detail && (
                <p className="text-[10px] text-[hsl(var(--muted-foreground)/0.6)] mt-0.5 truncate">
                    {detail}
                </p>
            )}
        </div>
    );
}