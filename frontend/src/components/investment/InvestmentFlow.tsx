"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    IndianRupee,
    ArrowRight,
    ChevronLeft,
    Shield,
    Zap,
    Scale,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGenerateAllocation } from "@/hooks/use-recommendations";
import { RecommendationCard } from "./RecommendationCard";
import type { AllocationResponse } from "@/lib/api/types";

type Step = "amount" | "risk" | "results";
type RiskProfile = "conservative" | "moderate" | "aggressive";

interface InvestmentFlowProps {
    className?: string;
    onComplete?: (result: AllocationResponse) => void;
}

export function InvestmentFlow({ className, onComplete }: InvestmentFlowProps) {
    const [step, setStep] = useState<Step>("amount");
    const [amount, setAmount] = useState("");
    const [riskProfile, setRiskProfile] = useState<RiskProfile>("moderate");
    const [result, setResult] = useState<AllocationResponse | null>(null);

    const { mutate: generateAllocation, isPending } = useGenerateAllocation();

    const handleAmountSubmit = () => {
        if (parseFloat(amount) > 0) {
            setStep("risk");
        }
    };

    const handleRiskSubmit = () => {
        generateAllocation(
            {
                amount: parseFloat(amount),
                risk_profile: riskProfile,
            },
            {
                onSuccess: (data) => {
                    setResult(data);
                    setStep("results");
                    onComplete?.(data);
                },
            }
        );
    };

    const handleBack = () => {
        if (step === "risk") setStep("amount");
        if (step === "results") setStep("risk");
    };

    const handleReset = () => {
        setStep("amount");
        setAmount("");
        setRiskProfile("moderate");
        setResult(null);
    };

    return (
        <Card className={cn("border-border bg-card overflow-hidden", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Monthly Investment</CardTitle>
                    {step !== "amount" && (
                        <Button variant="ghost" size="sm" onClick={handleBack}>
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                    )}
                </div>
                {/* Progress indicator */}
                <div className="flex gap-1 mt-2">
                    {(["amount", "risk", "results"] as Step[]).map((s, i) => (
                        <div
                            key={s}
                            className={cn(
                                "h-1 flex-1 rounded-full transition-colors",
                                step === s || (["amount", "risk", "results"].indexOf(step) > i)
                                    ? "bg-primary"
                                    : "bg-secondary"
                            )}
                        />
                    ))}
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                <AnimatePresence mode="wait">
                    {step === "amount" && (
                        <motion.div
                            key="amount"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div>
                                <label className="text-sm text-muted-foreground mb-3 block">
                                    How much can you invest this month?
                                </label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        placeholder="25,000"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="pl-10 h-12 text-lg bg-background"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {[10000, 25000, 50000, 100000].map((val) => (
                                    <Button
                                        key={val}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAmount(val.toString())}
                                        className="text-xs"
                                    >
                                        ₹{val.toLocaleString("en-IN")}
                                    </Button>
                                ))}
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleAmountSubmit}
                                disabled={!amount || parseFloat(amount) <= 0}
                            >
                                Continue
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </motion.div>
                    )}

                    {step === "risk" && (
                        <motion.div
                            key="risk"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div>
                                <label className="text-sm text-muted-foreground mb-4 block">
                                    What's your comfort level with risk?
                                </label>
                                <div className="space-y-3">
                                    <RiskOption
                                        value="conservative"
                                        label="Conservative"
                                        description="Prioritize capital protection. Lower returns, lower risk."
                                        icon={<Shield className="h-5 w-5" />}
                                        selected={riskProfile === "conservative"}
                                        onSelect={() => setRiskProfile("conservative")}
                                    />
                                    <RiskOption
                                        value="moderate"
                                        label="Moderate"
                                        description="Balanced approach. Mix of growth and safety."
                                        icon={<Scale className="h-5 w-5" />}
                                        selected={riskProfile === "moderate"}
                                        onSelect={() => setRiskProfile("moderate")}
                                    />
                                    <RiskOption
                                        value="aggressive"
                                        label="Aggressive"
                                        description="Focus on growth. Higher potential returns, higher volatility."
                                        icon={<Zap className="h-5 w-5" />}
                                        selected={riskProfile === "aggressive"}
                                        onSelect={() => setRiskProfile("aggressive")}
                                    />
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleRiskSubmit}
                                disabled={isPending}
                            >
                                {isPending ? "Calculating..." : "Get Suggestions"}
                                {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                            </Button>
                        </motion.div>
                    )}

                    {step === "results" && result && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Allocation for ₹{parseFloat(amount).toLocaleString("en-IN")}
                                </span>
                                <Button variant="ghost" size="sm" onClick={handleReset}>
                                    Start over
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {result.allocations.map((allocation) => (
                                    <RecommendationCard
                                        key={allocation.id}
                                        allocation={allocation}
                                    />
                                ))}
                            </div>

                            <p className="text-xs text-muted-foreground text-center pt-2">
                                {result.disclaimer}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

interface RiskOptionProps {
    value: RiskProfile;
    label: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onSelect: () => void;
}

function RiskOption({
    label,
    description,
    icon,
    selected,
    onSelect,
}: RiskOptionProps) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full p-4 rounded-lg border text-left transition-all",
                selected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-secondary/30"
            )}
        >
            <div className="flex items-start gap-3">
                <div
                    className={cn(
                        "p-2 rounded-lg",
                        selected ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                    )}
                >
                    {icon}
                </div>
                <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
        </button>
    );
}