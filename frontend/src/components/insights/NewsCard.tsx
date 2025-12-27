"use client";

import { Newspaper, ExternalLink, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Note: News would come from a news API or scraper
// For now, using static structure that can be connected to API

interface NewsItem {
    id: string;
    title: string;
    source: string;
    category: "market" | "policy" | "rates" | "general";
    url: string;
    published_at: string;
    summary?: string;
}

interface NewsCardProps {
    className?: string;
    items?: NewsItem[];
    isLoading?: boolean;
}

const categoryColors: Record<NewsItem["category"], string> = {
    market: "bg-blue-500/20 text-blue-400",
    policy: "bg-purple-500/20 text-purple-400",
    rates: "bg-green-500/20 text-green-400",
    general: "bg-gray-500/20 text-gray-400",
};

export function NewsCard({ className, items = [], isLoading }: NewsCardProps) {
    // Mock data for display - replace with actual API
    const mockNews: NewsItem[] = [
        {
            id: "1",
            title: "RBI keeps repo rate unchanged at 6.5% for 11th time",
            source: "Economic Times",
            category: "policy",
            url: "#",
            published_at: new Date().toISOString(),
            summary: "The central bank maintained status quo on interest rates.",
        },
        {
            id: "2",
            title: "Small Finance Banks offer up to 9% FD rates for senior citizens",
            source: "Mint",
            category: "rates",
            url: "#",
            published_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
            id: "3",
            title: "Nifty 50 hits all-time high amid strong FII inflows",
            source: "Business Standard",
            category: "market",
            url: "#",
            published_at: new Date(Date.now() - 172800000).toISOString(),
        },
    ];

    const displayItems = items.length > 0 ? items : mockNews;

    return (
        <Card className={cn("border-border bg-card", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-primary" />
                    Relevant Updates
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {displayItems.map((item) => (
                    <NewsItem key={item.id} item={item} />
                ))}
            </CardContent>
        </Card>
    );
}

function NewsItem({ item }: { item: NewsItem }) {
    const timeAgo = getTimeAgo(new Date(item.published_at));

    return (

        <a href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
        >
            <div className="p-3 rounded-lg border border-border/50 hover:border-border hover:bg-secondary/20 transition-all">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge
                        variant="secondary"
                        className={cn("text-[10px]", categoryColors[item.category])}
                    >
                        {item.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo}
                    </div>
                </div>
                <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                    {item.title}
                </p>
                {item.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.summary}
                    </p>
                )}
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <span>{item.source}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </a >
    );
}

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}