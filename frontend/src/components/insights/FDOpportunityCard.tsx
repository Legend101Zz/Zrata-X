"use client";

import { Building2, TrendingUp, ExternalLink, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopFDRates } from "@/hooks/use-fd-rates";
import { cn } from "@/lib/utils";

interface FDOpportunityCardProps {
    className?: string;
    limit?: number;
    showHeader?: boolean;
}

export function FDOpportunityCard({
    className,
    limit = 3,
    showHeader = true,
}: FDOpportunityCardProps) {
    const { data: rates, isLoading, error } = useTopFDRates(limit);

    if (error) {
        return (
            <Card className={cn("border-border", className)}>
                <CardContent className="py-6 text-center text-muted-foreground">
                    Unable to load FD rates. Please try again later.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("border-border bg-card", className)}>
            {showHeader && (
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-green-400" />
                        Top FD Opportunities
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className="space-y-3">
                {isLoading ? (
                    <>
                        {[...Array(limit)].map((_, i) => (
                            <FDRateSkeleton key={i} />
                        ))}
                    </>
                ) : (
                    <>
                        {rates?.map((rate, index) => (
                            <FDRateItem key={rate.id} rate={rate} rank={index + 1} />
                        ))}
                        <Button
                            variant="ghost"
                            className="w-full text-muted-foreground hover:text-foreground"
                            size="sm"
                        >
                            View all FD rates
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

interface FDRateItemProps {
    rate: {
        id: string;
        bank_name: string;
        bank_type: string;
        tenure_months: number;
        rate_regular: number;
        rate_senior: number;
        source_url?: string;
    };
    rank: number;
}

function FDRateItem({ rate, rank }: FDRateItemProps) {
    const tenureLabel =
        rate.tenure_months >= 12
            ? `${rate.tenure_months / 12}Y`
            : `${rate.tenure_months}M`;

    return (
        <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-4">
                    #{rank}
                </span>
                <div>
                    <p className="font-medium text-sm">{rate.bank_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {rate.bank_type.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{tenureLabel}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="font-mono font-bold text-green-400">
                    {rate.rate_regular.toFixed(2)}%
                </p>
                {rate.rate_senior > rate.rate_regular && (
                    <p className="text-[10px] text-muted-foreground">
                        Senior: {rate.rate_senior.toFixed(2)}%
                    </p>
                )}
            </div>
        </div>
    );
}

function FDRateSkeleton() {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
            <Skeleton className="h-5 w-14" />
        </div>
    );
}