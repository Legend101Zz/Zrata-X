"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Info,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    AlertCircle,
    TrendingUp,
    Building2,
    Coins,
    Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRecommendation } from "@/hooks/use-recommendations";
import { useAuthStore } from "@/lib/store/auth-store";
import type {
    SuggestionItem,
    RecommendationResponse,
    GuestRecommendationResponse,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type RecommendationData = RecommendationResponse | GuestRecommendationResponse;

export default function AllocatePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const amount = parseFloat(searchParams.get("amount") || "0");
    const riskProfile =
        (searchParams.get("risk") as "conservative" | "moderate" | "aggressive") ||
        "moderate";

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [recommendationData, setRecommendationData] =
        useState<RecommendationData | null>(null);

    const { isAuthenticated } = useAuthStore();
    const {
        mutate: getRecommendation,
        isPending,
        isError,
        error,
    } = useRecommendation();

    // Fetch recommendation on mount
    useEffect(() => {
        if (!amount || amount <= 0) {
            router.push("/dashboard");
            return;
        }

        getRecommendation(
            {
                amount,
                risk_profile: riskProfile,
                include_fds: true,
                include_gold: true,
            },
            {
                onSuccess: (data) => {
                    setRecommendationData(data);
                },
            }
        );
    }, [amount, riskProfile, getRecommendation, router]);

    const handleRecalculate = () => {
        if (amount > 0) {
            getRecommendation(
                {
                    amount,
                    risk_profile: riskProfile,
                    include_fds: true,
                    include_gold: true,
                },
                {
                    onSuccess: (data) => {
                        setRecommendationData(data);
                    },
                }
            );
        }
    };

    if (!amount || amount <= 0) {
        return null;
    }

    const suggestions = recommendationData?.suggestions || [];
    const marketContext = recommendationData?.market_context;
    const disclaimer =
        "disclaimer" in (recommendationData || {})
            ? (recommendationData as GuestRecommendationResponse).disclaimer
            : "This is educational information, not investment advice.";

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start justify-between"
            >
                <div>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back
                    </Link>
                    <h1 className="text-2xl font-bold mb-1">Your Allocation</h1>
                    <p className="text-muted-foreground">
                        Suggested split for{" "}
                        <span className="text-foreground font-mono font-semibold">
                            ₹{amount.toLocaleString("en-IN")}
                        </span>
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecalculate}
                    disabled={isPending}
                    className="hidden sm:flex"
                >
                    <RefreshCw
                        className={cn("h-4 w-4 mr-2", isPending && "animate-spin")}
                    />
                    Recalculate
                </Button>
            </motion.div>

            {/* Summary & Risk Note */}
            {recommendationData && !isPending && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="space-y-3"
                >
                    {recommendationData.summary && (
                        <Card className="border-border bg-secondary/30">
                            <CardContent className="py-4">
                                <p className="text-sm">{recommendationData.summary}</p>
                            </CardContent>
                        </Card>
                    )}
                    {recommendationData.risk_note && (
                        <Card className="border-border bg-amber-500/10 border-amber-500/20">
                            <CardContent className="py-3 flex items-start gap-2">
                                <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-amber-200/80">
                                    {recommendationData.risk_note}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            )}

            {/* Allocation Breakdown Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="border-border bg-card overflow-hidden">
                    <CardContent className="p-0">
                        <div className="p-4 border-b border-border">
                            <p className="text-sm text-muted-foreground mb-2">
                                Allocation Breakdown
                            </p>
                            <div className="flex h-3 rounded-full overflow-hidden bg-secondary">
                                {!isPending &&
                                    suggestions.map((item, i) => (
                                        <div
                                            key={`${item.instrument_id}-${i}`}
                                            className={`h-full ${getAssetColor(item.asset_type)}`}
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    ))}
                                {isPending && (
                                    <div className="h-full w-full bg-secondary animate-pulse" />
                                )}
                            </div>
                        </div>
                        <div className="p-4 flex flex-wrap gap-4">
                            {!isPending &&
                                [...new Set(suggestions.map((s) => s.asset_type))].map(
                                    (type) => (
                                        <div key={type} className="flex items-center gap-2 text-sm">
                                            <div
                                                className={`h-3 w-3 rounded ${getAssetColor(type)}`}
                                            />
                                            <span className="text-muted-foreground capitalize">
                                                {type.replace("_", " ")}
                                            </span>
                                            <span className="font-mono">
                                                {suggestions
                                                    .filter((s) => s.asset_type === type)
                                                    .reduce((sum, s) => sum + s.percentage, 0)
                                                    .toFixed(0)}
                                                %
                                            </span>
                                        </div>
                                    )
                                )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Error State */}
            {isError && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="border-destructive/50 bg-destructive/10">
                        <CardContent className="py-4 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <div>
                                <p className="font-medium text-destructive">
                                    Failed to generate recommendations
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {error?.message || "Please try again later."}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRecalculate}
                                className="ml-auto"
                            >
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Suggestion Items */}
            <div className="space-y-3">
                {isPending
                    ? [...Array(4)].map((_, i) => (
                        <Card key={i} className="border-border">
                            <CardContent className="py-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                    <Skeleton className="h-6 w-24" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                    : suggestions.map((item, index) => (
                        <SuggestionCard
                            key={`${item.instrument_id}-${index}`}
                            item={item}
                            isExpanded={expandedId === `${item.instrument_id}-${index}`}
                            onToggle={() =>
                                setExpandedId(
                                    expandedId === `${item.instrument_id}-${index}`
                                        ? null
                                        : `${item.instrument_id}-${index}`
                                )
                            }
                            delay={index * 0.1}
                        />
                    ))}
            </div>

            {/* Action Section */}
            {!isPending && suggestions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-4"
                >
                    <Card className="border-border bg-secondary/30">
                        <CardContent className="py-4">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-foreground mb-1">
                                        What's next?
                                    </p>
                                    <p className="text-muted-foreground">
                                        Execute through your preferred broker or bank. Zrata-X
                                        doesn't hold your money — you're always in control.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-center">
                        <Button variant="outline" onClick={() => router.push("/dashboard")}>
                            Start Fresh
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center pt-4">
                {disclaimer}
            </p>
        </div>
    );
}

function SuggestionCard({
    item,
    isExpanded,
    onToggle,
    delay,
}: {
    item: SuggestionItem;
    isExpanded: boolean;
    onToggle: () => void;
    delay: number;
}) {
    const Icon = getAssetIcon(item.asset_type);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <Card
                className={cn(
                    "border-border transition-colors",
                    isExpanded ? "bg-secondary/30" : "bg-card hover:bg-secondary/20"
                )}
            >
                <CardContent className="py-4">
                    <button onClick={onToggle} className="w-full text-left">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${getAssetColor(
                                        item.asset_type
                                    )}`}
                                >
                                    <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-medium">{item.instrument_name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="secondary" className="text-xs capitalize">
                                            {item.asset_type.replace("_", " ")}
                                        </Badge>
                                        {item.current_rate && (
                                            <span className="text-xs text-green-400">
                                                {item.current_rate}% p.a.
                                            </span>
                                        )}
                                        {item.highlight && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs border-amber-500/50 text-amber-400"
                                            >
                                                {item.highlight}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="font-mono font-semibold">
                                        ₹{item.amount.toLocaleString("en-IN")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.percentage.toFixed(0)}%
                                    </p>
                                </div>
                                {isExpanded ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                        </div>
                    </button>

                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-border"
                        >
                            <p className="text-sm text-muted-foreground">{item.reason}</p>
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

function getAssetColor(assetType: string): string {
    const colors: Record<string, string> = {
        mutual_fund: "bg-blue-500",
        equity: "bg-blue-500",
        fixed_deposit: "bg-green-500",
        fd: "bg-green-500",
        gold: "bg-yellow-500",
        silver: "bg-gray-400",
        debt: "bg-teal-500",
        bond: "bg-teal-500",
        liquid: "bg-purple-500",
        ppf: "bg-orange-500",
        nps: "bg-indigo-500",
    };
    return colors[assetType.toLowerCase()] || "bg-gray-500";
}

function getAssetIcon(assetType: string) {
    const icons: Record<string, typeof TrendingUp> = {
        mutual_fund: TrendingUp,
        equity: TrendingUp,
        fixed_deposit: Building2,
        fd: Building2,
        gold: Coins,
        silver: Coins,
        debt: Banknote,
        bond: Banknote,
        liquid: Banknote,
        ppf: Banknote,
        nps: Banknote,
    };
    return icons[assetType.toLowerCase()] || TrendingUp;
}