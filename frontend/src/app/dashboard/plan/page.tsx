"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    Building2,
    Coins,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePipelineRecommendation } from "@/hooks/use-pipeline";
import type { PipelineResponse, PipelineAllocation } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const ASSET_CONFIG: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
    equity: { icon: TrendingUp, label: "Equity", color: "hsl(var(--primary))" },
    debt: { icon: Building2, label: "Debt / FD", color: "hsl(142 71% 45%)" },
    gold: { icon: Coins, label: "Gold", color: "hsl(45 93% 47%)" },
    silver: { icon: Coins, label: "Silver", color: "hsl(220 14% 65%)" },
    mutual_fund: { icon: TrendingUp, label: "Mutual Fund", color: "hsl(217 91% 60%)" },
};

export default function PlanPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const amount = parseFloat(searchParams.get("amount") || "0");

    const { mutate: getPlan, isPending, data: plan, isError, error } = usePipelineRecommendation();

    useEffect(() => {
        if (!amount || amount <= 0) {
            router.push("/dashboard");
            return;
        }
        getPlan({ amount });
    }, [amount]);

    if (!amount || amount <= 0) return null;

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push("/dashboard")}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1
                        className="text-xl font-light"
                        style={{ fontFamily: "var(--font-serif)" }}
                    >
                        Your plan for{" "}
                        <span className="text-[hsl(var(--primary))]">
                            ₹{amount.toLocaleString("en-IN")}
                        </span>
                    </h1>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* ── Loading State ── */}
                {isPending && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-20 gap-4"
                    >
                        <div className="relative">
                            <Loader2 className="h-8 w-8 text-[hsl(var(--primary))] animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-[hsl(var(--foreground))]">
                                Reading market signals...
                            </p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                Analyzing your portfolio, checking macro conditions, calculating allocation
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ── Error State ── */}
                {isError && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <AlertTriangle className="h-8 w-8 text-[hsl(var(--loss))] mx-auto mb-3" />
                        <p className="text-sm mb-4">Something went wrong generating your plan.</p>
                        <Button variant="outline" size="sm" onClick={() => getPlan({ amount })}>
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Try again
                        </Button>
                    </motion.div>
                )}

                {/* ── Result ── */}
                {plan && !isPending && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-8"
                    >
                        {/* ── Allocation Cards ── */}
                        <div className="space-y-3">
                            {plan.allocation.map((alloc, i) => {
                                const config = ASSET_CONFIG[alloc.asset_class] || ASSET_CONFIG.equity;
                                const Icon = config.icon;
                                return (
                                    <motion.div
                                        key={alloc.asset_class}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: i * 0.1 }}
                                        className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                                                    style={{ background: `${config.color}15` }}
                                                >
                                                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{config.label}</p>
                                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                                        {alloc.percentage}% of this month
                                                    </p>
                                                </div>
                                            </div>
                                            <p
                                                className="text-lg font-light tabular-nums"
                                                style={{ fontFamily: "var(--font-serif)" }}
                                            >
                                                ₹{alloc.amount.toLocaleString("en-IN")}
                                            </p>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="h-1 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${alloc.percentage}%` }}
                                                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                                                className="h-full rounded-full"
                                                style={{ background: config.color }}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* ── Explanation ── */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                    Why this split
                                </p>
                            </div>
                            <p
                                className="text-sm leading-relaxed text-[hsl(var(--foreground)/0.85)]"
                                style={{ fontFamily: "var(--font-serif)" }}
                            >
                                {plan.explanation}
                            </p>
                        </motion.div>

                        {/* ── Validation ── */}
                        {plan.validation && plan.validation.validation === "flag" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="space-y-2"
                            >
                                {plan.validation.flags.map((flag, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex items-start gap-3 rounded-lg px-4 py-3 text-sm border",
                                            flag.severity === "critical" &&
                                            "border-[hsl(var(--loss)/0.3)] bg-[hsl(var(--loss)/0.05)]",
                                            flag.severity === "warning" &&
                                            "border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.05)]",
                                            flag.severity === "info" &&
                                            "border-[hsl(var(--border))] bg-[hsl(var(--secondary))]"
                                        )}
                                    >
                                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-xs">{flag.issue}</p>
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                                                {flag.suggestion}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {plan.validation?.validation === "pass" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="flex items-center gap-2 text-xs text-[hsl(var(--gain))]"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Allocation reviewed — looks good for your risk profile.
                            </motion.div>
                        )}

                        {/* ── Signals used ── */}
                        {plan.signals_used && plan.signals_used.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
                                    Signals considered
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {plan.signals_used.map((sig, i) => (
                                        <span
                                            key={i}
                                            className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full border",
                                                sig.direction === "bullish" &&
                                                "border-[hsl(var(--gain)/0.3)] text-[hsl(var(--gain)/0.8)]",
                                                sig.direction === "bearish" &&
                                                "border-[hsl(var(--loss)/0.3)] text-[hsl(var(--loss)/0.8)]",
                                                sig.direction === "neutral" &&
                                                "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                                            )}
                                        >
                                            {sig.name.replace(/_/g, " ")}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ── Actions ── */}
                        <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => getPlan({ amount })}
                                className="text-xs"
                            >
                                <RefreshCw className="mr-1.5 h-3 w-3" />
                                Regenerate
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push("/dashboard")}
                                className="text-xs"
                            >
                                Change amount
                            </Button>
                        </div>

                        <p className="text-[10px] text-[hsl(var(--muted-foreground)/0.4)] text-center">
                            For educational purposes. Not investment advice.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}