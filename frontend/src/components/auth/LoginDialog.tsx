"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store/auth-store";
import { useLogin, useSignup } from "@/hooks/use-auth";
import {
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    User,
    X,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────
interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface FieldError {
    field: string;
    message: string;
}

interface PasswordStrength {
    score: 0 | 1 | 2 | 3 | 4;
    label: string;
    color: string;
}

// ─── Validation helpers ──────────────────────────────────
function validateEmail(email: string): string | null {
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
    return null;
}

function validatePassword(password: string, isSignup: boolean): string | null {
    if (!password) return "Password is required";
    if (password.length < 8) return "At least 8 characters";
    if (isSignup && !/[A-Z]/.test(password) && !/[0-9]/.test(password)) {
        return "Add a number or uppercase letter";
    }
    return null;
}

function validateName(name: string): string | null {
    if (!name.trim()) return "Name is required";
    if (name.trim().length < 2) return "Name is too short";
    return null;
}

function getPasswordStrength(password: string): PasswordStrength {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

    const levels: Record<number, { label: string; color: string }> = {
        0: { label: "Too short", color: "hsl(var(--loss))" },
        1: { label: "Weak", color: "hsl(var(--loss))" },
        2: { label: "Fair", color: "hsl(var(--primary))" },
        3: { label: "Good", color: "hsl(var(--gain))" },
        4: { label: "Strong", color: "hsl(var(--gain))" },
    };

    return {
        score: score as PasswordStrength["score"],
        ...levels[score],
    };
}

// ─── Parse API error messages into something human ───────
function parseApiError(error: Error | null): string {
    if (!error) return "";
    const msg = error.message?.toLowerCase() || "";

    if (msg.includes("401") || msg.includes("invalid") || msg.includes("incorrect"))
        return "Wrong email or password. Double-check and try again.";
    if (msg.includes("409") || msg.includes("already exists") || msg.includes("duplicate"))
        return "An account with this email already exists. Try signing in.";
    if (msg.includes("422") || msg.includes("validation"))
        return "Something's off with the details. Check the fields above.";
    if (msg.includes("429") || msg.includes("too many"))
        return "Too many attempts. Wait a minute and try again.";
    if (msg.includes("500") || msg.includes("server"))
        return "Our server is having a moment. Try again shortly.";
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("unavailable"))
        return "Can't reach the server. Check your connection.";

    // Fallback: use the original message if it's readable
    return error.message || "Something went wrong. Please try again.";
}

// ─── Atmospheric quotes for the left panel ───────────────
const PANEL_QUOTES = [
    { text: "Wealth is not about having a lot of money; it's about having a lot of options.", by: "Chris Rock" },
    { text: "Do not save what is left after spending, but spend what is left after saving.", by: "Warren Buffett" },
    { text: "The habit of saving is itself an education.", by: "T. T. Munger" },
    { text: "Compound interest is the eighth wonder of the world.", by: "Albert Einstein" },
];

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════
export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Track which fields have been touched (for showing errors)
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Pick a random quote when dialog opens
    const [quoteIdx] = useState(() => Math.floor(Math.random() * PANEL_QUOTES.length));
    const quote = PANEL_QUOTES[quoteIdx];

    const emailRef = useRef<HTMLInputElement>(null);
    const { setGuest } = useAuthStore();
    const router = useRouter();

    const loginMutation = useLogin();
    const signupMutation = useSignup();

    const isLoading = loginMutation.isPending || signupMutation.isPending;
    const isLogin = mode === "login";

    // Get the active mutation error
    const apiError = isLogin ? loginMutation.error : signupMutation.error;

    // ── Reset on open/mode change ──
    useEffect(() => {
        if (open) {
            // Small delay to let the dialog animate in, then focus
            setTimeout(() => emailRef.current?.focus(), 300);
        }
    }, [open]);

    const resetForm = useCallback(() => {
        setEmail("");
        setPassword("");
        setName("");
        setTouched({});
        setShowPassword(false);
        loginMutation.reset();
        signupMutation.reset();
    }, [loginMutation, signupMutation]);

    const toggleMode = () => {
        setMode((m) => (m === "login" ? "signup" : "login"));
        resetForm();
    };

    const markTouched = (field: string) => {
        setTouched((t) => ({ ...t, [field]: true }));
    };

    // ── Field-level errors (only show after touch) ──
    const fieldErrors: FieldError[] = [];

    const emailError = validateEmail(email);
    if (touched.email && emailError) {
        fieldErrors.push({ field: "email", message: emailError });
    }

    const passwordError = validatePassword(password, !isLogin);
    if (touched.password && passwordError) {
        fieldErrors.push({ field: "password", message: passwordError });
    }

    if (!isLogin) {
        const nameError = validateName(name);
        if (touched.name && nameError) {
            fieldErrors.push({ field: "name", message: nameError });
        }
    }

    const hasFieldError = (field: string) => fieldErrors.some((e) => e.field === field);
    const getFieldError = (field: string) => fieldErrors.find((e) => e.field === field)?.message;

    // Is the form valid (all fields, even untouched)?
    const isFormValid = isLogin
        ? !validateEmail(email) && !validatePassword(password, false)
        : !validateEmail(email) && !validatePassword(password, true) && !validateName(name);

    const passwordStrength = getPasswordStrength(password);

    // ── Submit ──
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Touch all fields to show any remaining errors
        setTouched({ email: true, password: true, name: true });

        if (!isFormValid) return;

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

    const handleGuest = () => {
        setGuest();
        onOpenChange(false);
        resetForm();
        router.push("/dashboard");
    };

    const handleOpenChange = (next: boolean) => {
        if (!next) resetForm();
        onOpenChange(next);
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
            <DialogPrimitive.Portal>
                {/* ── Overlay ── */}
                <DialogPrimitive.Overlay
                    className={cn(
                        "fixed inset-0 z-50",
                        "bg-[hsl(20_14%_4%/0.85)] backdrop-blur-sm",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                    )}
                />

                {/* ── Content ── */}
                <DialogPrimitive.Content
                    className={cn(
                        "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
                        "w-[calc(100%-2rem)] max-w-[780px]",
                        "rounded-xl border border-[hsl(var(--border))]",
                        "bg-[hsl(var(--card))] shadow-2xl shadow-black/40",
                        "overflow-hidden",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98]",
                        "data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-2",
                        "duration-200"
                    )}
                >
                    <div className="flex min-h-[480px]">
                        {/* ════════════════════════════════════════════
                LEFT PANEL — atmosphere (hidden on mobile)
               ════════════════════════════════════════════ */}
                        <div
                            className={cn(
                                "hidden md:flex flex-col justify-between w-[280px] shrink-0 p-8",
                                "relative overflow-hidden"
                            )}
                            style={{
                                background:
                                    "linear-gradient(165deg, hsl(20 14% 6%) 0%, hsl(28 20% 9%) 50%, hsl(38 25% 10%) 100%)",
                            }}
                        >
                            {/* Decorative grid lines */}
                            <div
                                className="absolute inset-0 opacity-[0.03]"
                                style={{
                                    backgroundImage: `
                    linear-gradient(hsl(38 92% 50% / 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, hsl(38 92% 50% / 0.3) 1px, transparent 1px)
                  `,
                                    backgroundSize: "40px 40px",
                                }}
                            />

                            {/* Amber glow orb */}
                            <div
                                className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.07]"
                                style={{ background: "radial-gradient(circle, hsl(38 92% 50%), transparent 70%)" }}
                            />

                            {/* Top: branding */}
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-12">
                                    <div className="h-7 w-7 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center">
                                        <span className="font-bold text-[hsl(var(--primary-foreground))] text-xs">
                                            Z
                                        </span>
                                    </div>
                                    <span
                                        className="text-xs tracking-[0.2em] text-[hsl(var(--muted-foreground))]"
                                        style={{ fontFamily: "var(--font-serif)" }}
                                    >
                                        ZRATA-X
                                    </span>
                                </div>

                                <p
                                    className="text-[hsl(var(--foreground)/0.7)] text-sm leading-relaxed"
                                    style={{ fontFamily: "var(--font-serif)" }}
                                >
                                    Monthly investing,
                                    <br />
                                    <span className="text-[hsl(var(--primary))]">made calm.</span>
                                </p>
                            </div>

                            {/* Bottom: quote */}
                            <div className="relative z-10">
                                <div className="h-px w-8 bg-[hsl(var(--primary)/0.3)] mb-4" />
                                <p
                                    className="text-xs text-[hsl(var(--muted-foreground)/0.6)] leading-relaxed italic"
                                    style={{ fontFamily: "var(--font-serif)" }}
                                >
                                    "{quote.text}"
                                </p>
                                <p className="text-[10px] text-[hsl(var(--muted-foreground)/0.35)] mt-2">
                                    — {quote.by}
                                </p>
                            </div>
                        </div>

                        {/* ════════════════════════════════════════════
                RIGHT PANEL — form
               ════════════════════════════════════════════ */}
                        <div className="flex-1 flex flex-col p-6 md:p-8">
                            {/* Close button */}
                            <DialogPrimitive.Close
                                className={cn(
                                    "absolute right-4 top-4 rounded-md p-1",
                                    "text-[hsl(var(--muted-foreground)/0.4)]",
                                    "hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]",
                                    "transition-gentle"
                                )}
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </DialogPrimitive.Close>

                            {/* Header with animated mode switch */}
                            <div className="mb-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={mode}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <DialogPrimitive.Title
                                            className="text-xl font-light mb-1"
                                            style={{ fontFamily: "var(--font-serif)" }}
                                        >
                                            {isLogin ? "Welcome back" : "Create your account"}
                                        </DialogPrimitive.Title>
                                        <DialogPrimitive.Description className="text-xs text-[hsl(var(--muted-foreground))]">
                                            {isLogin
                                                ? "Sign in to access your portfolio and personalised plans."
                                                : "Start tracking your investments. Takes 30 seconds."}
                                        </DialogPrimitive.Description>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* ── API Error Banner ── */}
                            <AnimatePresence>
                                {apiError && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="overflow-hidden"
                                    >
                                        <div
                                            className={cn(
                                                "flex items-start gap-2.5 rounded-lg px-3.5 py-3",
                                                "bg-[hsl(var(--loss)/0.06)] border border-[hsl(var(--loss)/0.15)]",
                                                "text-sm text-[hsl(var(--loss))]"
                                            )}
                                        >
                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-medium leading-snug">
                                                    {parseApiError(apiError)}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Form ── */}
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col" noValidate>
                                <div className="space-y-4 flex-1">
                                    {/* Name field (signup only) */}
                                    <AnimatePresence>
                                        {!isLogin && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <FormField
                                                    id="auth-name"
                                                    label="Name"
                                                    icon={<User className="h-3.5 w-3.5" />}
                                                    error={getFieldError("name")}
                                                    hasError={hasFieldError("name")}
                                                >
                                                    <Input
                                                        id="auth-name"
                                                        type="text"
                                                        placeholder="Your name"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        onBlur={() => markTouched("name")}
                                                        disabled={isLoading}
                                                        autoComplete="name"
                                                        className={cn(
                                                            "pl-9 h-10 text-sm",
                                                            "bg-[hsl(var(--background))] border-[hsl(var(--border))]",
                                                            "placeholder:text-[hsl(var(--muted-foreground)/0.3)]",
                                                            "focus:border-[hsl(var(--primary)/0.5)] focus:ring-1 focus:ring-[hsl(var(--primary)/0.15)]",
                                                            hasFieldError("name") &&
                                                            "border-[hsl(var(--loss)/0.5)] focus:border-[hsl(var(--loss)/0.5)] focus:ring-[hsl(var(--loss)/0.15)]"
                                                        )}
                                                    />
                                                </FormField>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Email */}
                                    <FormField
                                        id="auth-email"
                                        label="Email"
                                        icon={<Mail className="h-3.5 w-3.5" />}
                                        error={getFieldError("email")}
                                        hasError={hasFieldError("email")}
                                        success={touched.email && !emailError ? true : false}
                                    >
                                        <Input
                                            ref={emailRef}
                                            id="auth-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                // Clear API error on edit
                                                if (apiError) {
                                                    loginMutation.reset();
                                                    signupMutation.reset();
                                                }
                                            }}
                                            onBlur={() => markTouched("email")}
                                            disabled={isLoading}
                                            autoComplete="email"
                                            className={cn(
                                                "pl-9 h-10 text-sm",
                                                "bg-[hsl(var(--background))] border-[hsl(var(--border))]",
                                                "placeholder:text-[hsl(var(--muted-foreground)/0.3)]",
                                                "focus:border-[hsl(var(--primary)/0.5)] focus:ring-1 focus:ring-[hsl(var(--primary)/0.15)]",
                                                hasFieldError("email") &&
                                                "border-[hsl(var(--loss)/0.5)] focus:border-[hsl(var(--loss)/0.5)] focus:ring-[hsl(var(--loss)/0.15)]",
                                                touched.email &&
                                                !emailError &&
                                                "border-[hsl(var(--gain)/0.3)]"
                                            )}
                                        />
                                    </FormField>

                                    {/* Password */}
                                    <FormField
                                        id="auth-password"
                                        label="Password"
                                        icon={<Lock className="h-3.5 w-3.5" />}
                                        error={getFieldError("password")}
                                        hasError={hasFieldError("password")}
                                        trailing={
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowPassword((s) => !s)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground)/0.4)] hover:text-[hsl(var(--muted-foreground))] transition-gentle"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Eye className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        }
                                    >
                                        <Input
                                            id="auth-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                if (apiError) {
                                                    loginMutation.reset();
                                                    signupMutation.reset();
                                                }
                                            }}
                                            onBlur={() => markTouched("password")}
                                            disabled={isLoading}
                                            autoComplete={isLogin ? "current-password" : "new-password"}
                                            className={cn(
                                                "pl-9 pr-10 h-10 text-sm",
                                                "bg-[hsl(var(--background))] border-[hsl(var(--border))]",
                                                "placeholder:text-[hsl(var(--muted-foreground)/0.3)]",
                                                "focus:border-[hsl(var(--primary)/0.5)] focus:ring-1 focus:ring-[hsl(var(--primary)/0.15)]",
                                                hasFieldError("password") &&
                                                "border-[hsl(var(--loss)/0.5)] focus:border-[hsl(var(--loss)/0.5)] focus:ring-[hsl(var(--loss)/0.15)]"
                                            )}
                                        />
                                    </FormField>

                                    {/* Password strength bar (signup only) */}
                                    <AnimatePresence>
                                        {!isLogin && password.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex-1 flex gap-1">
                                                        {[0, 1, 2, 3].map((i) => (
                                                            <div
                                                                key={i}
                                                                className="h-1 flex-1 rounded-full transition-all duration-300"
                                                                style={{
                                                                    background:
                                                                        i < passwordStrength.score
                                                                            ? passwordStrength.color
                                                                            : "hsl(var(--secondary))",
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span
                                                        className="text-[10px] tabular-nums shrink-0 transition-colors duration-300"
                                                        style={{ color: passwordStrength.color }}
                                                    >
                                                        {passwordStrength.label}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* ── Actions ── */}
                                <div className="mt-6 space-y-3">
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className={cn(
                                            "w-full h-10 text-sm font-medium",
                                            "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
                                            "hover:bg-[hsl(38_92%_55%)]",
                                            "disabled:opacity-40",
                                            isFormValid && !isLoading && "amber-glow"
                                        )}
                                    >
                                        <AnimatePresence mode="wait">
                                            {isLoading ? (
                                                <motion.span
                                                    key="loading"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    {isLogin ? "Signing in..." : "Creating account..."}
                                                </motion.span>
                                            ) : (
                                                <motion.span
                                                    key="idle"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    {isLogin ? "Sign in" : "Create account"}
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </Button>

                                    {/* Divider */}
                                    <div className="relative">
                                        <div className="hr-warm" />
                                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[hsl(var(--card))] px-3 text-[10px] text-[hsl(var(--muted-foreground)/0.4)] uppercase tracking-wider">
                                            or
                                        </span>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleGuest}
                                        disabled={isLoading}
                                        className={cn(
                                            "w-full h-9 text-xs",
                                            "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                                            "hover:bg-[hsl(var(--secondary))]"
                                        )}
                                    >
                                        Continue without an account
                                    </Button>
                                </div>

                                {/* ── Toggle login/signup ── */}
                                <p className="text-center text-xs text-[hsl(var(--muted-foreground)/0.6)] mt-5">
                                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                                    <button
                                        type="button"
                                        onClick={toggleMode}
                                        disabled={isLoading}
                                        className="text-[hsl(var(--primary))] hover:underline underline-offset-2 font-medium disabled:opacity-50"
                                    >
                                        {isLogin ? "Sign up" : "Sign in"}
                                    </button>
                                </p>
                            </form>
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

// ═══════════════════════════════════════════════════════════
// FORM FIELD — reusable field wrapper with label, icon, error
// ═══════════════════════════════════════════════════════════
function FormField({
    id,
    label,
    icon,
    error,
    hasError,
    success,
    trailing,
    children,
}: {
    id: string;
    label: string;
    icon: React.ReactNode;
    error?: string;
    hasError?: boolean;
    success?: boolean;
    trailing?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label
                    htmlFor={id}
                    className="text-xs font-medium text-[hsl(var(--muted-foreground))]"
                >
                    {label}
                </label>

                {/* Inline error / success indicator */}
                <AnimatePresence mode="wait">
                    {hasError && error && (
                        <motion.span
                            key="error"
                            initial={{ opacity: 0, x: 4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 4 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1 text-[10px] text-[hsl(var(--loss))]"
                        >
                            <AlertCircle className="h-3 w-3" />
                            {error}
                        </motion.span>
                    )}
                    {success && !hasError && (
                        <motion.span
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                        >
                            <CheckCircle2 className="h-3 w-3 text-[hsl(var(--gain))]" />
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            <div className="relative">
                {/* Leading icon */}
                <span
                    className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200",
                        hasError
                            ? "text-[hsl(var(--loss)/0.5)]"
                            : "text-[hsl(var(--muted-foreground)/0.35)]"
                    )}
                >
                    {icon}
                </span>

                {children}

                {/* Trailing element (e.g. password toggle) */}
                {trailing}
            </div>
        </div>
    );
}