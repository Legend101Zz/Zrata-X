/**
 * Main dashboard page - Clean, minimal UI for passive investors.
 */
import { Suspense } from 'react';
import { PortfolioSnapshot } from '@/components/portfolio/PortfolioSnapshot';
import { InvestmentFlow } from '@/components/investment/InvestmentFlow';
import { MarketInsights } from '@/components/insights/MarketInsights';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header - Simple and calm */}
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-light text-slate-800 dark:text-slate-100 mb-2">
            Passive Compounder
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Your monthly investment co-pilot
          </p>
        </header>

        {/* Portfolio Snapshot - Visual, not numbers-heavy */}
        <section className="mb-12">
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
            <PortfolioSnapshot />
          </Suspense>
        </section>

        {/* Investment Flow - The heart of the app */}
        <section className="mb-12">
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
            <InvestmentFlow />
          </Suspense>
        </section>

        {/* Market Insights - Simple, not overwhelming */}
        <section>
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
            <MarketInsights />
          </Suspense>
        </section>
      </main>
    </div>
  );
}