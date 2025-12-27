/**
 * NewsCard - Displays a single news item with sentiment indicator
 */
'use client';

import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NewsItem {
    id: number;
    title: string;
    summary: string | null;
    source: string;
    url: string;
    published_at: string;
    sentiment_score: number | null;
    categories: string[];
}

interface Props {
    news: NewsItem;
}

const categoryColors: Record<string, string> = {
    gold: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    rbi: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    inflation: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    equity: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    debt: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    tax: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

export function NewsCard({ news }: Props) {
    const getSentimentIcon = () => {
        if (news.sentiment_score === null) return null;
        if (news.sentiment_score > 0.2) return <TrendingUp className="h-3 w-3 text-green-500" />;
        if (news.sentiment_score < -0.2) return <TrendingDown className="h-3 w-3 text-red-500" />;
        return <Minus className="h-3 w-3 text-slate-400" />;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffHours < 48) return 'Yesterday';
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return (
        <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
        >
            <div className="flex items-start gap-3">
                {/* Sentiment indicator */}
                <div className="flex-shrink-0 mt-1">
                    {getSentimentIcon()}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {news.title}
                    </h4>

                    {/* Summary */}
                    {news.summary && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {news.summary}
                        </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-slate-400">
                            {news.source}
                        </span>
                        <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-xs text-slate-400">
                            {formatDate(news.published_at)}
                        </span>

                        {/* Categories */}
                        {news.categories && news.categories.slice(0, 2).map((cat, index) => (
                            <Badge
                                key={index}
                                variant="outline"
                                className={`text-xs py-0 ${categoryColors[cat] || ''}`}
                            >
                                {cat}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* External link icon */}
                <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0" />
            </div>
        </a>
    );
}