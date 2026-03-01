"use client";

import { motion } from "framer-motion";
import { Radio, TrendingUp, Building2, Coins, Globe, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveSignals } from "@/hooks/use-signals";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG: Record<string, { icon: typeof Globe; label: string }> = {
    macro: { icon: Globe, label: "Macro" },
    equity: { icon: TrendingUp, label: "Equity" },
    debt: { icon: Building2, label: "Debt" },
    gold: { icon: Coins, label: "Gold" },
    geopolitics: { icon: Globe, label: "Geopolitics" },
    policy: { icon: Shield, label: "Policy" },
    tech: { icon: Radio, label: "Tech" },
};

export default function SignalsPage() {
    const { data: signals, isLoading } = useActiveSignals();

    // Group by category
    const grouped: Record<string, typeof signals> = {};
    signals?.forEach((sig) => {
        const cat = sig.signal_category || "other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat]!.push(sig);
    });

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1
                    className="text-2xl font-light mb-1"
                    style={{ fontFamily: "var(--font-serif)" }}
                >
                    Market Signals
                </h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Pre-processed signals that inform your monthly allocation. Updated 3x daily.
                </p>
            </motion.div>

            {isLoading && (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </div>
            )}

            {!isLoading && (!signals || signals.length === 0) && (
                <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                    <Radio className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No active signals right now.</p>
                    <p className="text-xs mt-1">Signals are generated from news and data processing.</p>
                </div>
            )}

            {Object.entries(grouped).map(([category, catSignals], catIdx) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.macro;
                const Icon = config.icon;

                return (
                    <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: catIdx * 0.1 }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Icon className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                {config.label}
                            </p>
                            <span className="text-[10px] text-[hsl(var(--muted-foreground)/0.5)]">
                                ({catSignals!.length})
                            </span>
                        </div>
                        <div className="space-y-2">
                            {catSignals!.map((sig, i) => (
                                <div
                                    key={sig.id || i}
                                    className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3"
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
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
                                        <span className="text-[10px] text-[hsl(var(--muted-foreground)/0.5)] uppercase">
                                            {sig.strength}
                                        </span>
                                        <span className="text-[10px] text-[hsl(var(--muted-foreground)/0.3)] ml-auto tabular-nums">
                                            {sig.confidence ? `${(sig.confidence * 100).toFixed(0)}% conf` : ""}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[hsl(var(--foreground)/0.8)] leading-relaxed">
                                        {sig.reasoning}
                                    </p>
                                    {sig.affected_asset_classes && sig.affected_asset_classes.length > 0 && (
                                        <div className="flex gap-1 mt-2">
                                            {sig.affected_asset_classes.map((ac) => (
                                                <span
                                                    key={ac}
                                                    className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                                                >
                                                    {ac}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}