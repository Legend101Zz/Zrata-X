"use client";

import { useEffect } from "react";
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
    Info,
    Loader2,
    CreditCard,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePipelineRecommendation } from "@/hooks/use-pipeline";
import type { PipelineResponse, PipelineAllocation } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// ── Config ──

const ASSET_CONFIG: Record<
    string,
    { icon: typeof TrendingUp; color: string; bg: string; label: string }
> = {
    equity: {
        icon: TrendingUp,
        label: "Equity",
        color: "hsl(var(--primary))",
        bg: "hsl(var(--primary) / 0.1)",
    },
    debt: {
        icon: Building2,
        label: "Debt / FD",
        color: "hsl(142 71% 45%)",
        bg: "hsl(142 71% 45% / 0.1)",
    },
    gold: {
        icon: Coins,
        label: "Gold / Silver",
        color: "hsl(45 93% 47%)",
        bg: "hsl(45 93% 47% / 0.1)",
    },
    silver: {
        icon: Coins,
        label: "Silver",
        color: "hsl(220 14% 65%)",
        bg: "hsl(220 14% 65% / 0.1)",
    },
};

function getConfig(assetClass: string) {
    return ASSET_CONFIG[assetClass] || ASSET_CONFIG.equity;
}

// ── Group instruments by asset class ──

interface AssetGroup {
    asset_class: string;
    total_amount: number;
    total_percentage: number;
    instruments: PipelineAllocation[];
}

function groupByAssetClass(allocations: PipelineAllocation[]): AssetGroup[] {
    const groups: Record<string, AssetGroup> = {};

    for (const alloc of allocations) {
        const key = alloc.asset_class;
        if (!groups[key]) {
            groups[key] = {
                asset_class: key,
                total_amount: 0,
                total_percentage: 0,
                instruments: [],
            };
        }
        groups[key].total_amount += alloc.amount;
        groups[key].total_percentage += alloc.percentage;
        groups[key].instruments.push(alloc);
    }

    // Sort: equity first, then debt, then gold
    const order = ["equity", "debt", "gold", "silver"];
    return Object.values(groups).sort(
        (a, b) => order.indexOf(a.asset_class) - order.indexOf(b.asset_class)
    );
}

// ── Page ──

export default function PlanPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const amount = parseFloat(searchParams.get("amount") || "0");

    const {
        mutate: getPlan,
        isPending,
        data: plan,
        isError,
    } = usePipelineRecommendation();

    useEffect(() => {
        if (!amount || amount <= 0) {
            router.push("/dashboard");
            return;
        }
        getPlan({ amount });
    }, [amount]);

    if (!amount || amount <= 0) return null;

    const groups = plan ? groupByAssetClass(plan.allocation) : [];
    const flags = plan?.validation?.flags || [];
    const hasWarnings = flags.some((f) => f.severity === "warning" || f.severity === "critical");

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-12">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
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
                            Your plan for ₹{amount.toLocaleString("en-IN")}
                        </h1>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => getPlan({ amount })}
                    disabled={isPending}
                    className="text-xs"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isPending && "animate-spin")} />
                    Redo
                </Button>
            </div>

            <AnimatePresence mode="wait">
                {/* ── Loading ── */}
                {isPending && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-24"
                    >
                        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))] mb-4" />
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            Analyzing markets & picking instruments…
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground)/0.5)] mt-1">
                            This takes 20-40 seconds
                        </p>
                    </motion.div>
                )}

                {/* ── Error ── */}
                {isError && !isPending && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <AlertTriangle className="h-6 w-6 text-[hsl(var(--loss))] mx-auto mb-3" />
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
                        className="space-y-6"
                    >
                        {/* ── Allocation Bar ── */}
                        <div className="space-y-2">
                            <div className="flex h-2.5 rounded-full overflow-hidden bg-[hsl(var(--muted)/0.3)]">
                                {groups.map((g) => (
                                    <div
                                        key={g.asset_class}
                                        style={{
                                            width: `${g.total_percentage}%`,
                                            backgroundColor: getConfig(g.asset_class).color,
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-4">
                                {groups.map((g) => {
                                    const conf = getConfig(g.asset_class);
                                    return (
                                        <div key={g.asset_class} className="flex items-center gap-1.5 text-xs">
                                            <div
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: conf.color }}
                                            />
                                            <span className="text-[hsl(var(--muted-foreground))]">
                                                {conf.label} {g.total_percentage.toFixed(0)}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Asset Groups with Instruments ── */}
                        <div className="space-y-4">
                            {groups.map((group, gi) => {
                                const conf = getConfig(group.asset_class);
                                const Icon = conf.icon;

                                return (
                                    <motion.div
                                        key={group.asset_class}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: gi * 0.1 }}
                                        className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden"
                                    >
                                        {/* Group header */}
                                        <div className="flex items-center justify-between px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                                                    style={{ backgroundColor: conf.bg }}
                                                >
                                                    <Icon className="h-4 w-4" style={{ color: conf.color }} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{conf.label}</p>
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                                        {group.total_percentage.toFixed(0)}% · ₹
                                                        {group.total_amount.toLocaleString("en-IN")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Individual instruments */}
                                        <div className="border-t border-[hsl(var(--border))]">
                                            {group.instruments.map((inst, ii) => (
                                                <div
                                                    key={`${inst.instrument_id}-${ii}`}
                                                    className={cn(
                                                        "px-5 py-3.5 flex items-start justify-between gap-4",
                                                        ii > 0 && "border-t border-[hsl(var(--border)/0.5)]"
                                                    )}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {inst.instrument_name || conf.label}
                                                        </p>
                                                        {inst.reason && (
                                                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">
                                                                {inst.reason}
                                                            </p>
                                                        )}
                                                        {inst.highlight && (
                                                            <div className="flex items-center gap-1 mt-1.5">
                                                                {inst.highlight
                                                                    .toLowerCase()
                                                                    .includes("credit card") ? (
                                                                    <CreditCard className="h-3 w-3 text-amber-400" />
                                                                ) : (
                                                                    <Info className="h-3 w-3 text-amber-400" />
                                                                )}
                                                                <span className="text-[11px] text-amber-400">
                                                                    {inst.highlight}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="font-mono text-sm font-semibold">
                                                            ₹{inst.amount.toLocaleString("en-IN")}
                                                        </p>
                                                        {inst.current_rate != null && (
                                                            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                                                                {group.asset_class === "debt"
                                                                    ? `${inst.current_rate}% p.a.`
                                                                    : `${inst.current_rate}% 1Y`}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* ── Explanation ── */}
                        {plan.explanation && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
                            >
                                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wider">
                                    Why this split
                                </p>
                                <p className="text-sm leading-relaxed text-[hsl(var(--foreground)/0.85)]">
                                    {plan.explanation}
                                </p>
                            </motion.div>
                        )}

                        {/* ── Validation Flags ── */}
                        {flags.length > 0 && (
                            <div className="space-y-2">
                                {flags.map((flag, fi) => (
                                    <div
                                        key={fi}
                                        className={cn(
                                            "flex items-start gap-2.5 rounded-lg px-4 py-3 text-xs",
                                            flag.severity === "critical" &&
                                            "bg-red-500/10 border border-red-500/20",
                                            flag.severity === "warning" &&
                                            "bg-amber-500/10 border border-amber-500/20",
                                            flag.severity === "info" &&
                                            "bg-blue-500/10 border border-blue-500/20"
                                        )}
                                    >
                                        {flag.severity === "info" ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <AlertTriangle
                                                className={cn(
                                                    "h-3.5 w-3.5 mt-0.5 flex-shrink-0",
                                                    flag.severity === "critical"
                                                        ? "text-red-400"
                                                        : "text-amber-400"
                                                )}
                                            />
                                        )}
                                        <div>
                                            <p className="font-medium">{flag.issue}</p>
                                            {flag.suggestion && (
                                                <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                                                    {flag.suggestion}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Signals used ── */}
                        {plan.signals_used && plan.signals_used.length > 0 && (
                            <div className="px-1">
                                <p className="text-[11px] text-[hsl(var(--muted-foreground)/0.5)] mb-1.5">
                                    Signals considered
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {plan.signals_used.map((sig, si) => (
                                        <span
                                            key={si}
                                            className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full border",
                                                sig.direction === "bullish"
                                                    ? "border-green-500/30 text-green-400/70"
                                                    : sig.direction === "bearish"
                                                        ? "border-red-500/30 text-red-400/70"
                                                        : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                                            )}
                                        >
                                            {sig.name.replace(/_/g, " ")}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Footer ── */}
                        <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
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