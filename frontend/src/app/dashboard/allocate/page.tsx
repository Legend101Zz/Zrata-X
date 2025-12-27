"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Check,
    IndianRupee,
    Info,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface AllocationItem {
    id: string;
    category: string;
    name: string;
    amount: number;
    percentage: number;
    reason: string;
    action?: string;
    link?: string;
}

export default function AllocatePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const amount = parseFloat(searchParams.get("amount") || "0");
    const [isLoading, setIsLoading] = useState(true);
    const [allocations, setAllocations] = useState<AllocationItem[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (!amount || amount <= 0) {
            router.push("/dashboard");
            return;
        }

        // Simulate API call for allocation suggestions
        // TODO: Replace with actual API call to backend
        const fetchAllocations = async () => {
            setIsLoading(true);
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Mock allocation logic (replace with actual backend calculation)
            const mockAllocations: AllocationItem[] = [
                {
                    id: "1",
                    category: "Fixed Income",
                    name: "Unity Small Finance Bank FD",
                    amount: Math.round(amount * 0.3),
                    percentage: 30,
                    reason:
                        "Highest FD rate at 8.5% for 1 year. Good for capital preservation with inflation-beating returns.",
                    action: "Open FD online",
                    link: "https://unitysmallfinancebank.com",
                },
                {
                    id: "2",
                    category: "Equity",
                    name: "Nifty 50 Index Fund",
                    amount: Math.round(amount * 0.35),
                    percentage: 35,
                    reason:
                        "Low-cost exposure to top 50 companies. Long-term wealth building with market returns.",
                    action: "Buy via your broker",
                },
                {
                    id: "3",
                    category: "Equity",
                    name: "Nifty Next 50 Index Fund",
                    amount: Math.round(amount * 0.15),
                    percentage: 15,
                    reason:
                        "Exposure to emerging large-caps. Higher growth potential with slightly more volatility.",
                    action: "Buy via your broker",
                },
                {
                    id: "4",
                    category: "Gold",
                    name: "Sovereign Gold Bond",
                    amount: Math.round(amount * 0.1),
                    percentage: 10,
                    reason:
                        "2.5% interest + gold appreciation. Tax-free if held to maturity. Hedge against uncertainty.",
                    action: "Buy during RBI issue window",
                },
                {
                    id: "5",
                    category: "Emergency",
                    name: "Liquid Fund",
                    amount: Math.round(amount * 0.1),
                    percentage: 10,
                    reason:
                        "Instant redemption available. Better than savings account. Park for emergencies.",
                    action: "Buy via any AMC",
                },
            ];

            setAllocations(mockAllocations);
            setIsLoading(false);
        };

        fetchAllocations();
    }, [amount, router]);

    if (!amount || amount <= 0) {
        return null;
    }

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
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-gentle"
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
                    onClick={() => window.location.reload()}
                    className="hidden sm:flex"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recalculate
                </Button>
            </motion.div>

            {/* Summary Card */}
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
                                {!isLoading &&
                                    allocations.map((item, i) => (
                                        <div
                                            key={item.id}
                                            className={`h-full ${getCategoryColor(item.category)}`}
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    ))}
                            </div>
                        </div>
                        <div className="p-4 flex flex-wrap gap-4">
                            {!isLoading &&
                                [...new Set(allocations.map((a) => a.category))].map((cat) => (
                                    <div key={cat} className="flex items-center gap-2 text-sm">
                                        <div
                                            className={`h-3 w-3 rounded ${getCategoryColor(cat)}`}
                                        />
                                        <span className="text-muted-foreground">{cat}</span>
                                        <span className="font-mono">
                                            {allocations
                                                .filter((a) => a.category === cat)
                                                .reduce((sum, a) => sum + a.percentage, 0)}
                                            %
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Allocation Items */}
            <div className="space-y-3">
                {isLoading ? (
                    // Loading skeletons
                    [...Array(4)].map((_, i) => (
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
                ) : (
                    allocations.map((item, index) => (
                        <AllocationCard
                            key={item.id}
                            item={item}
                            isExpanded={expandedId === item.id}
                            onToggle={() =>
                                setExpandedId(expandedId === item.id ? null : item.id)
                            }
                            delay={index * 0.1}
                        />
                    ))
                )}
            </div>

            {/* Action Section */}
            {!isLoading && (
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
                                        These are suggestions based on current market data. Execute
                                        through your preferred broker or bank. Zrata-X doesn't hold
                                        your money — you're always in control.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/dashboard")}
                        >
                            Start Fresh
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center pt-4">
                This is educational information, not investment advice. Please consult
                a financial advisor for personalized recommendations.
            </p>
        </div>
    );
}

function AllocationCard({
    item,
    isExpanded,
    onToggle,
    delay,
}: {
    item: AllocationItem;
    isExpanded: boolean;
    onToggle: () => void;
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <Card
                className={`border-border transition-gentle ${isExpanded ? "bg-secondary/30" : "bg-card hover:bg-secondary/20"
                    }`}
            >
                <CardContent className="py-4">
                    <button
                        onClick={onToggle}
                        className="w-full text-left focus:outline-none"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${getCategoryColor(
                                        item.category
                                    )}`}
                                >
                                    <span className="text-white font-bold text-sm">
                                        {item.percentage}%
                                    </span>
                                </div>
                                <div>
                                    <p className="font-medium">{item.name}</p>
                                    <Badge variant="secondary" className="text-xs mt-1">
                                        {item.category}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className="font-mono font-semibold text-right">
                                    ₹{item.amount.toLocaleString("en-IN")}
                                </p>
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
                            <p className="text-sm text-muted-foreground mb-4">{item.reason}</p>
                            {item.action && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        {item.action}
                                    </span>
                                    {item.link && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2"
                                            asChild
                                        >

                                            <a href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Visit
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div >
    );
}

function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        "Fixed Income": "bg-green-500",
        Equity: "bg-blue-500",
        Gold: "bg-yellow-500",
        Emergency: "bg-purple-500",
        Debt: "bg-teal-500",
    };
    return colors[category] || "bg-gray-500";
}