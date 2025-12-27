"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Plus,
    Wallet,
    Building2,
    TrendingUp,
    Banknote,
    Coins,
    MoreVertical,
    Trash2,
    Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

// Types for holdings
interface Holding {
    id: string;
    name: string;
    type: "mutual_fund" | "fd" | "stock" | "gold" | "ppf" | "epf";
    value: number;
    units?: number;
    purchaseDate?: string;
}

const holdingTypeConfig = {
    mutual_fund: { icon: TrendingUp, label: "Mutual Fund", color: "text-blue-400" },
    fd: { icon: Building2, label: "Fixed Deposit", color: "text-green-400" },
    stock: { icon: TrendingUp, label: "Stock", color: "text-purple-400" },
    gold: { icon: Coins, label: "Gold", color: "text-yellow-400" },
    ppf: { icon: Banknote, label: "PPF", color: "text-orange-400" },
    epf: { icon: Banknote, label: "EPF", color: "text-teal-400" },
};

export default function PortfolioPage() {
    const { isGuest } = useAuthStore();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

    const handleAddHolding = (holding: Omit<Holding, "id">) => {
        setHoldings([...holdings, { ...holding, id: Date.now().toString() }]);
        setIsAddOpen(false);
    };

    const handleDeleteHolding = (id: string) => {
        setHoldings(holdings.filter((h) => h.id !== id));
    };

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
                        <AddHoldingForm onAdd={handleAddHolding} />
                    </DialogContent>
                </Dialog>
            </motion.div>

            {/* Guest Warning */}
            {isGuest && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm"
                >
                    <span className="text-amber-400 font-medium">Guest mode:</span>{" "}
                    <span className="text-muted-foreground">
                        Holdings added here won't be saved. Sign in to persist your
                        portfolio.
                    </span>
                </motion.div>
            )}

            {/* Total Value Card */}
            {holdings.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-border bg-gradient-to-br from-primary/10 to-primary/5">
                        <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground mb-1">
                                Total Portfolio Value
                            </p>
                            <p className="text-3xl font-bold font-mono">
                                ₹{totalValue.toLocaleString("en-IN")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Holdings List */}
            {holdings.length > 0 ? (
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
                            onDelete={() => handleDeleteHolding(holding.id)}
                            delay={index * 0.05}
                        />
                    ))}
                </motion.div>
            ) : (
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
    const config = holdingTypeConfig[holding.type];
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
        >
            <Card className="border-border bg-card hover:bg-secondary/30 transition-gentle">
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
                        <p className="font-mono font-semibold">
                            ₹{holding.value.toLocaleString("en-IN")}
                        </p>
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
}: {
    onAdd: (holding: Omit<Holding, "id">) => void;
}) {
    const [name, setName] = useState("");
    const [type, setType] = useState<Holding["type"]>("mutual_fund");
    const [value, setValue] = useState("");
    const [units, setUnits] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            name,
            type,
            value: parseFloat(value),
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
                    <Label htmlFor="value">Current Value (₹)</Label>
                    <Input
                        id="value"
                        type="number"
                        placeholder="100000"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="bg-background border-border"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="units">Units (optional)</Label>
                    <Input
                        id="units"
                        type="number"
                        placeholder="125.5"
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                        className="bg-background border-border"
                    />
                </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Add Holding
            </Button>
        </form>
    );
}