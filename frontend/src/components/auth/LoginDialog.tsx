"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/store/auth-store";
import { useLogin, useSignup } from "@/hooks/use-auth";
import { Mail, Lock, ArrowRight, Sparkles, Loader2, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    const { setGuest } = useAuthStore();
    const router = useRouter();

    const loginMutation = useLogin();
    const signupMutation = useSignup();

    const isLoading = loginMutation.isPending || signupMutation.isPending;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLogin) {
            loginMutation.mutate(
                { email, password },
                {
                    onSuccess: () => {
                        onOpenChange(false);
                        resetForm();
                    },
                }
            );
        } else {
            signupMutation.mutate(
                { email, password, name },
                {
                    onSuccess: () => {
                        onOpenChange(false);
                        resetForm();
                    },
                }
            );
        }
    };

    const handleContinueAsGuest = () => {
        setGuest();
        onOpenChange(false);
        router.push("/dashboard");
    };

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setName("");
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        resetForm();
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                />
                <DialogPrimitive.Content
                    className={cn(
                        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
                        "rounded-lg border border-border p-6 shadow-2xl duration-200",
                        "bg-[hsl(222,47%,11%)]", // Explicit solid background
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    )}
                >
                    {/* Close button */}
                    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>

                    {/* Header */}
                    <div className="flex flex-col gap-2 text-center sm:text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="font-bold text-primary-foreground text-sm">Z</span>
                            </div>
                            <span className="font-semibold">Zrata-X</span>
                        </div>
                        <DialogPrimitive.Title className="text-xl font-semibold">
                            {isLogin ? "Welcome back" : "Create your account"}
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Description className="text-sm text-muted-foreground">
                            {isLogin
                                ? "Sign in to access your portfolio and history."
                                : "Start tracking your investments today."}
                        </DialogPrimitive.Description>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        placeholder="Your name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10 bg-background/50 border-border"
                                        required={!isLogin}
                                        disabled={isLoading}
                                    />
                                </div>
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
                                    className="pl-10 bg-background/50 border-border"
                                    required
                                    disabled={isLoading}
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
                                    className="pl-10 bg-background/50 border-border"
                                    required
                                    minLength={8}
                                    disabled={isLoading}
                                />
                            </div>
                            {!isLogin && (
                                <p className="text-xs text-muted-foreground">
                                    Minimum 8 characters
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {isLogin ? "Signing in..." : "Creating account..."}
                                </>
                            ) : (
                                <>
                                    {isLogin ? "Sign in" : "Create account"}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="relative my-4">
                        <Separator />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[hsl(222,47%,11%)] px-2 text-xs text-muted-foreground">
                            or
                        </span>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleContinueAsGuest}
                        disabled={isLoading}
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Continue as Guest
                    </Button>

                    <p className="text-center text-sm text-muted-foreground mt-4">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-primary hover:underline font-medium"
                            disabled={isLoading}
                        >
                            {isLogin ? "Sign up" : "Sign in"}
                        </button>
                    </p>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}