"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/store/auth-store";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";

interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { setUser, setGuest } = useAuthStore();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock successful login
        setUser({
            id: "1",
            email,
            name: name || email.split("@")[0],
        });

        setIsLoading(false);
        onOpenChange(false);
        router.push("/dashboard");
    };

    const handleContinueAsGuest = () => {
        setGuest();
        onOpenChange(false);
        router.push("/dashboard");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="font-bold text-primary-foreground text-sm">Z</span>
                        </div>
                        <span className="font-semibold">Zrata-X</span>
                    </div>
                    <DialogTitle className="text-xl">
                        {isLogin ? "Welcome back" : "Create your account"}
                    </DialogTitle>
                    <DialogDescription>
                        {isLogin
                            ? "Sign in to access your portfolio and history."
                            : "Start tracking your investments today."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {!isLogin && (
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 bg-background border-border"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 bg-background border-border"
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            "Please wait..."
                        ) : (
                            <>
                                {isLogin ? "Sign In" : "Create Account"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>

                <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        or
                    </span>
                </div>

                <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleContinueAsGuest}
                >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Continue without account
                </Button>

                {/* Benefits of signing in */}
                <div className="mt-4 p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                        Why sign in?
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-primary" />
                            Track your portfolio across sessions
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-primary" />
                            Get smarter suggestions over time
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-primary" />
                            Your data stays private
                        </li>
                    </ul>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-primary hover:underline"
                    >
                        {isLogin ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </DialogContent>
        </Dialog>
    );
}