"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AllocationItem } from "@/lib/api/types";

interface RecommendationCardProps {
    allocation: AllocationItem;
    className?: string;
}

const categoryColors: Record<string, string> = {
    equity: "bg-blue-500",
    debt: "bg-green-500",
    "fixed income": "bg-green-500",
    gold: "bg-yellow-500",
    emergency: "bg-purple-500",
    hybrid: "bg-orange-500",
};

export function RecommendationCard({
    allocation,
    className,
}: RecommendationCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMarkedDone, setIsMarkedDone] = useState(false);

    const bgColor = categoryColors[allocation.category.toLowerCase()] || "bg-gray-500";

    return (
        <Card
            className={cn(
                "border-border transition-all",
                isMarkedDone && "opacity-60",
                className
            )}
        >
            <CardContent className="py-3 px-4">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full text-left"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className={cn(
                                    "h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm",
                                    bgColor
                                )}
                            >
                                {allocation.percentage}%
                            </div>
                            <div>
                                <p className={cn("font-medium", isMarkedDone && "line-through")}>
                                    {allocation.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="secondary" className="text-[10px]">
                                        {allocation.category}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {allocation.instrument_type}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="font-mono font-semibold">
                                ₹{allocation.amount.toLocaleString("en-IN")}
                            </p>
                            {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </button>

                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4">
                        <p className="text-sm text-muted-foreground">{allocation.reason}</p>

                        <div className="flex items-center justify-between gap-2">
                            <Button
                                variant={isMarkedDone ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setIsMarkedDone(!isMarkedDone)}
                                className="gap-2"
                            >
                                <Check className={cn("h-4 w-4", isMarkedDone && "text-green-400")} />
                                {isMarkedDone ? "Done" : "Mark as done"}
                            </Button>

                            {allocation.action_url && (
                                <Button size="sm" variant="outline" asChild>

                                    <a href={allocation.action_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="gap-2"
                                    >
                                        {allocation.action_text || "Learn more"}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card >
    );
}