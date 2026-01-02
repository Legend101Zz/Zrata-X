"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Plus,
    Wallet,
    Building2,
    TrendingUp,
    TrendingDown,
    Banknote,
    Coins,
    MoreVertical,
    Trash2,
    Edit,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/store/auth-store";
import {
    useHoldings,
    useAddHolding,
    useDeleteHolding,
    usePortfolioSummary,
} from "@/hooks/use-portfolio";
import type { Holding, CreateHoldingInput } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const holdingTypeConfig: Record<Holding["type"], { icon: typeof TrendingUp; label: string; color: string }> = {
    mutual_fund: { icon: TrendingUp, label: "Mutual Fund", color: "text-blue-400" },
    fd: { icon: Building2, label: "Fixed Deposit", color: "text-green-400" },
    stock: { icon: TrendingUp, label: "Stock", color: "text-purple-400" },
    gold: { icon: Coins, label: "Gold", color: "text-yellow-400" },
    ppf: { icon: Banknote, label: "PPF", color: "text-orange-400" },
    epf: { icon: Banknote, label: "EPF", color: "text-teal-400" },
    nps: { icon: Banknote, label: "NPS", color: "text-indigo-400" },
    bond: { icon: Building2, label: "Bond", color: "text-cyan-400" },
};

export default function PortfolioPage() {
    const { isGuest, isAuthenticated } = useAuthStore();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Use React Query hooks for real API integration
    const { data: holdings, isLoading, isError, error } = useHoldings();
    const { data: summary } = usePortfolioSummary();
    const addHoldingMutation = useAddHolding();
    const deleteHoldingMutation = useDeleteHolding();

    const handleAddHolding = (data: CreateHoldingInput) => {
        addHoldingMutation.mutate(data, {
            onSuccess: () => {
                setIsAddOpen(false);
            },
        });
    };

    const handleDeleteHolding = () => {
        if (deleteId) {
            deleteHoldingMutation.mutate(deleteId, {
                onSuccess: () => {
                    setDeleteId(null);
                },
            });
        }
    };

    // Guest state - show local storage option or prompt to sign in
    if (isGuest || !isAuthenticated) {
        return <GuestPortfolioView />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-2xl font-bold mb-1">My Holdings</h1>
                    <p className="text-muted-foreground text-sm">
                        Track what you own to get better suggestions.
                    </p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Holding
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                        <DialogHeader>
                            <DialogTitle>Add New Holding</DialogTitle>
                        </DialogHeader>
                        <AddHoldingForm
                            onAdd={handleAddHolding}
                            isLoading={addHoldingMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </motion.div>

            {/* Portfolio Summary Card */}
            {summary && holdings && holdings.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-border bg-gradient-to-br from-primary/10 to-primary/5">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        Total Value
                                    </p>
                                    <p className="text-2xl font-bold font-mono">
                                        ₹{summary.total_value.toLocaleString("en-IN")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        Invested
                                    </p>
                                    <p className="text-2xl font-bold font-mono">
                                        ₹{summary.total_invested.toLocaleString("en-IN")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        Returns
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {summary.total_returns >= 0 ? (
                                            <TrendingUp className="h-4 w-4 text-green-400" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 text-red-400" />
                                        )}
                                        <p className={cn(
                                            "text-2xl font-bold font-mono",
                                            summary.total_returns >= 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {summary.returns_percentage >= 0 ? "+" : ""}
                                            {summary.returns_percentage.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">
                                        Holdings
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {summary.holdings_count}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Error State */}
            {isError && (
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="py-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <div>
                            <p className="font-medium text-destructive">Failed to load holdings</p>
                            <p className="text-sm text-muted-foreground">
                                {error?.message || "Please try again later."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
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
                    ))}
                </div>
            )}

            {/* Holdings List */}
            {!isLoading && holdings && holdings.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3"
                >
                    {holdings.map((holding, index) => (
                        <HoldingCard
                            key={holding.id}
                            holding={holding}
                            onDelete={() => setDeleteId(holding.id)}
                            delay={index * 0.05}
                        />
                    ))}
                </motion.div>
            )}

            {/* Empty State */}
            {!isLoading && (!holdings || holdings.length === 0) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-border border-dashed">
                        <CardContent className="py-12 text-center">
                            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <h3 className="font-medium mb-2">No holdings yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Add your existing investments to get portfolio-aware
                                suggestions.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setIsAddOpen(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add your first holding
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Holding</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this holding? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteHolding}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={deleteHoldingMutation.isPending}
                        >
                            {deleteHoldingMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function GuestPortfolioView() {
    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-2xl font-bold mb-1">My Holdings</h1>
                <p className="text-muted-foreground text-sm">
                    Track what you own to get better suggestions.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm"
            >
                <span className="text-amber-400 font-medium">Guest mode:</span>{" "}
                <span className="text-muted-foreground">
                    Sign in to save and track your portfolio. Your holdings data will persist across sessions.
                </span>
            </motion.div>

            <Card className="border-border border-dashed">
                <CardContent className="py-12 text-center">
                    <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-2">Sign in to track holdings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Create an account to add and track your investments for portfolio-aware suggestions.
                    </p>
                    <Button variant="outline">
                        Sign in to continue
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function HoldingCard({
    holding,
    onDelete,
    delay,
}: {
    holding: Holding;
    onDelete: () => void;
    delay: number;
}) {
    const config = holdingTypeConfig[holding.type] || holdingTypeConfig.mutual_fund;
    const Icon = config.icon;

    const gainLoss = holding.current_value - holding.invested_value;
    const gainLossPercent = holding.invested_value > 0
        ? ((gainLoss / holding.invested_value) * 100)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
        >
            <Card className="border-border bg-card hover:bg-secondary/30 transition-colors">
                <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className={`h-10 w-10 rounded-lg bg-secondary flex items-center justify-center ${config.color}`}
                        >
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-medium">{holding.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">
                                    {config.label}
                                </Badge>
                                {holding.units && (
                                    <span className="text-xs text-muted-foreground">
                                        {holding.units} units
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="font-mono font-semibold">
                                ₹{holding.current_value.toLocaleString("en-IN")}
                            </p>
                            <p className={cn(
                                "text-xs font-mono",
                                gainLoss >= 0 ? "text-green-400" : "text-red-400"
                            )}>
                                {gainLoss >= 0 ? "+" : ""}{gainLossPercent.toFixed(2)}%
                            </p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={onDelete}
                                    className="text-destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function AddHoldingForm({
    onAdd,
    isLoading,
}: {
    onAdd: (data: CreateHoldingInput) => void;
    isLoading: boolean;
}) {
    const [name, setName] = useState("");
    const [type, setType] = useState<Holding["type"]>("mutual_fund");
    const [currentValue, setCurrentValue] = useState("");
    const [investedValue, setInvestedValue] = useState("");
    const [units, setUnits] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            name,
            type,
            current_value: parseFloat(currentValue),
            invested_value: investedValue ? parseFloat(investedValue) : parseFloat(currentValue),
            units: units ? parseFloat(units) : undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as Holding["type"])}>
                    <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(holdingTypeConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                                {config.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    placeholder="e.g., HDFC Flexi Cap Fund"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background border-border"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="currentValue">Current Value (₹)</Label>
                    <Input
                        id="currentValue"
                        type="number"
                        placeholder="100000"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        className="bg-background border-border"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="investedValue">Invested Value (₹)</Label>
                    <Input
                        id="investedValue"
                        type="number"
                        placeholder="90000"
                        value={investedValue}
                        onChange={(e) => setInvestedValue(e.target.value)}
                        className="bg-background border-border"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="units">Units (optional)</Label>
                <Input
                    id="units"
                    type="number"
                    step="0.001"
                    placeholder="125.5"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="bg-background border-border"
                />
            </div>

            <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                    </>
                ) : (
                    "Add Holding"
                )}
            </Button>
        </form>
    );
}