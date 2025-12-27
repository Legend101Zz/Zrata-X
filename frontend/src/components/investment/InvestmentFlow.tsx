/**
 * Investment Flow - The heart of the app.
 * Simple question: "How much do you want to invest?"
 */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, ArrowRight, Info } from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';

type RiskLevel = 'low' | 'moderate' | 'high';

interface Suggestion {
    asset_type: string;
    instrument_name: string;
    instrument_id: string;
    amount: number;
    percentage: number;
    reason: string;
    highlight?: string;
    current_rate?: number;
}

interface Recommendation {
    id: number;
    suggestions: Suggestion[];
    summary: string;
    risk_note: string;
    tax_note?: string;
}

export function InvestmentFlow() {
    const [amount, setAmount] = useState<string>('');
    const [riskLevel, setRiskLevel] = useState<RiskLevel>('moderate');
    const [avoidLockIns, setAvoidLockIns] = useState(false);
    const [preferTaxSaving, setPreferTaxSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
    const [step, setStep] = useState<'input' | 'preferences' | 'result'>('input');

    const handleAnalyze = async () => {
        if (!amount || isNaN(Number(amount))) return;

        setLoading(true);
        try {
            const res = await fetch('/api/v1/recommend/invest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(amount),
                    risk_override: riskLevel,
                    avoid_lock_ins: avoidLockIns,
                    prefer_tax_saving: preferTaxSaving,
                    include_fds: true,
                    include_gold: true,
                }),
            });

            const data = await res.json();
            setRecommendation(data);
            setStep('result');
        } catch (error) {
            console.error('Failed to get recommendation:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (value: string): string => {
        const num = parseInt(value.replace(/,/g, ''), 10);
        if (isNaN(num)) return '';
        return num.toLocaleString('en-IN');
    };

    const riskLabels: Record<RiskLevel, string> = {
        low: 'Conservative',
        moderate: 'Balanced',
        high: 'Growth-focused',
    };

    // Step 1: Amount Input
    if (step === 'input') {
        return (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-medium text-center text-slate-700 dark:text-slate-200">
                        How much do you want to invest this month?
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400">
                            ₹
                        </span>
                        <Input
                            type="text"
                            value={formatAmount(amount)}
                            onChange={(e) => setAmount(e.target.value.replace(/,/g, ''))}
                            placeholder="50,000"
                            className="text-3xl font-light text-center h-16 pl-10 border-2 focus:border-blue-500"
                        />
                    </div>

                    {/* Quick amount buttons */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {[10000, 25000, 50000, 100000].map((val) => (
                            <Button
                                key={val}
                                variant="outline"
                                size="sm"
                                onClick={() => setAmount(val.toString())}
                                className="rounded-full"
                            >
                                ₹{(val / 1000)}K
                            </Button>
                        ))}
                    </div>

                    <Button
                        onClick={() => setStep('preferences')}
                        disabled={!amount || Number(amount) <= 0}
                        className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                    >
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Step 2: Preferences
    if (step === 'preferences') {
        return (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-medium text-center text-slate-700 dark:text-slate-200">
                        Quick preferences
                    </CardTitle>
                    <p className="text-center text-slate-500">
                        Investing ₹{formatAmount(amount)}
                    </p>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Risk Slider */}
                    <div className="space-y-4">
                        <Label className="text-sm text-slate-600 dark:text-slate-300">
                            Risk Preference
                        </Label>
                        <div className="px-2">
                            <Slider
                                value={[['low', 'moderate', 'high'].indexOf(riskLevel)]}
                                onValueChange={([val]) => setRiskLevel(['low', 'moderate', 'high'][val] as RiskLevel)}
                                max={2}
                                step={1}
                                className="w-full"
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Safe</span>
                            <span className="font-medium text-blue-600">{riskLabels[riskLevel]}</span>
                            <span>Growth</span>
                        </div>
                    </div>

                    {/* Toggle preferences */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="no-lockin" className="text-sm">
                                    Avoid lock-in periods
                                </Label>
                                <Info className="h-4 w-4 text-slate-400" />
                            </div>
                            <Switch
                                id="no-lockin"
                                checked={avoidLockIns}
                                onCheckedChange={setAvoidLockIns}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="tax-saving" className="text-sm">
                                    Prefer tax-saving (80C)
                                </Label>
                                <Info className="h-4 w-4 text-slate-400" />
                            </div>
                            <Switch
                                id="tax-saving"
                                checked={preferTaxSaving}
                                onCheckedChange={setPreferTaxSaving}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setStep('input')}
                            className="flex-1"
                        >
                            Back
                        </Button>
                        <Button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Get Suggestions
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Step 3: Results
    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-medium text-slate-700 dark:text-slate-200">
                        Here's what I'd suggest
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                        For ₹{formatAmount(amount)} with {riskLabels[riskLevel].toLowerCase()} approach
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {recommendation?.suggestions.map((suggestion, index) => (
                        <RecommendationCard key={index} suggestion={suggestion} />
                    ))}

                    {/* Summary */}
                    {recommendation?.summary && (
                        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                {recommendation.summary}
                            </p>
                        </div>
                    )}

                    {/* Risk Note */}
                    {recommendation?.risk_note && (
                        <p className="text-xs text-slate-500 italic">
                            ⚠️ {recommendation.risk_note}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Button
                variant="outline"
                onClick={() => {
                    setStep('input');
                    setRecommendation(null);
                }}
                className="w-full"
            >
                Start Over
            </Button>
        </div>
    );
}