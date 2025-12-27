"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    ArrowRight,
    IndianRupee,
    TrendingUp,
    Wallet,
    Calendar,
    Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";

export default function DashboardPage() {
    const [amount, setAmount] = useState("");
    const router = useRouter();
    const { user, isGuest } = useAuthStore();
    const displayName = user?.name || "there";

    const handleGetSuggestions = () => {
        if (amount && parseFloat(amount) > 0) {
            router.push(`/dashboard/allocate?amount=${amount}`);
        }
    };

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    Hey {displayName} 👋
                </h1>
                <p className="text-muted-foreground">
                    Let's figure out your monthly investment calmly.
                </p>
            </motion.div>

            {/* Main Input Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <Card className="border-border bg-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            This Month's Investment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <label className="text-sm text-muted-foreground mb-3 block">
                                How much can you invest this month?
                            </label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        placeholder="25,000"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="pl-10 h-12 text-lg bg-background border-border"
                                    />
                                </div>
                                <Button
                                    size="lg"
                                    onClick={handleGetSuggestions}
                                    disabled={!amount || parseFloat(amount) <= 0}
                                    className="h-12 px-6 bg-primary hover:bg-primary/90"
                                >
                                    Get Suggestions
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Quick Amounts */}
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground mr-2 self-center">
                                Quick:
                            </span>
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
                    </CardContent>
                </Card>
            </motion.div>

            {/* Market Context Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <h2 className="text-lg font-semibold mb-4">Current Context</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ContextCard
                        title="Top FD Rate"
                        value="8.5%"
                        subtitle="Unity Small Finance Bank"
                        badge="1 Year"
                    />
                    <ContextCard
                        title="Inflation (CPI)"
                        value="4.83%"
                        subtitle="November 2024"
                        trend="down"
                    />
                    <ContextCard
                        title="Nifty 50"
                        value="23,813"
                        subtitle="Dec 2024"
                        trend="up"
                    />
                </div>
            </motion.div>

            {/* Portfolio Summary (if logged in) */}
            {!isGuest && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Card className="border-border bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-primary" />
                                Your Holdings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="mb-4">No holdings added yet</p>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/dashboard/portfolio")}
                                >
                                    Add Your First Holding
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Guest Banner */}
            {isGuest && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="p-4 rounded-lg bg-secondary/30 border border-border flex items-start gap-3"
                >
                    <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">
                            Exploring as guest.
                        </span>{" "}
                        Your suggestions work, but they won't consider your existing
                        holdings. Sign in to get portfolio-aware recommendations that
                        improve over time.
                    </div>
                </motion.div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center pt-4">
                Zrata-X provides educational data for informed decisions. Not investment
                advice.
            </p>
        </div>
    );
}

function ContextCard({
    title,
    value,
    subtitle,
    badge,
    trend,
}: {
    title: string;
    value: string;
    subtitle: string;
    badge?: string;
    trend?: "up" | "down";
}) {
    return (
        <Card className="border-border bg-card/50">
            <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">{title}</p>
                        <p className="text-2xl font-bold font-mono">{value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                    </div>
                    {badge && (
                        <Badge variant="secondary" className="text-xs">
                            {badge}
                        </Badge>
                    )}
                    {trend && (
                        <TrendingUp
                            className={`h-5 w-5 ${trend === "up" ? "text-green-500" : "text-red-500 rotate-180"
                                }`}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}