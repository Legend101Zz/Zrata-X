"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    Wallet,
    Sparkles,
    Radio,
    Menu,
    LogOut,
    User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/store/auth-store";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "This Month" },
    { href: "/dashboard/portfolio", icon: Wallet, label: "Holdings" },
    { href: "/dashboard/signals", icon: Radio, label: "Signals" },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const { user, isGuest, logout, isAuthenticated } = useAuthStore();

    return (
        <div className="min-h-screen flex">
            {/* ── Desktop Sidebar ── */}
            <aside className="hidden lg:flex flex-col w-56 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                {/* Logo */}
                <div className="p-5 pb-6">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center">
                            <span className="font-bold text-[hsl(var(--primary-foreground))] text-xs">
                                Z
                            </span>
                        </div>
                        <span
                            className="text-sm tracking-wide text-[hsl(var(--muted-foreground))]"
                            style={{ fontFamily: "var(--font-serif)" }}
                        >
                            ZRATA-X
                        </span>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 space-y-0.5">
                    {navItems.map((item) => {
                        const isActive =
                            item.href === "/dashboard"
                                ? pathname === "/dashboard" || pathname.startsWith("/dashboard/plan")
                                : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-gentle relative",
                                    isActive
                                        ? "text-[hsl(var(--primary))]"
                                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-active"
                                        className="absolute inset-0 rounded-lg bg-[hsl(var(--primary)/0.08)]"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <item.icon className="h-4 w-4 relative z-10" />
                                <span className="relative z-10">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Guest banner */}
                {isGuest && (
                    <div className="mx-3 mb-3 p-3 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2">
                            Exploring as guest
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowLogin(true)}
                            className="w-full text-xs h-7"
                        >
                            Sign in for portfolio tracking
                        </Button>
                    </div>
                )}

                {/* User */}
                <div className="p-3 border-t border-[hsl(var(--border))]">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--secondary))] transition-gentle">
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] text-[10px]">
                                        {user?.name?.[0]?.toUpperCase() || "G"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-xs font-medium truncate">
                                        {user?.name || "Guest"}
                                    </p>
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                                        {user?.email || "Not signed in"}
                                    </p>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            {isAuthenticated ? (
                                <>
                                    <DropdownMenuItem>
                                        <User className="mr-2 h-3.5 w-3.5" />
                                        Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout} className="text-destructive">
                                        <LogOut className="mr-2 h-3.5 w-3.5" />
                                        Sign out
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <DropdownMenuItem onClick={() => setShowLogin(true)}>
                                    <User className="mr-2 h-3.5 w-3.5" />
                                    Sign in
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* ── Mobile Header ── */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-12 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.85)] backdrop-blur-lg flex items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center">
                        <span className="font-bold text-[hsl(var(--primary-foreground))] text-[10px]">
                            Z
                        </span>
                    </div>
                </Link>

                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Menu className="h-4 w-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-56 p-0 bg-[hsl(var(--card))]">
                        <div className="p-5 border-b border-[hsl(var(--border))]">
                            <span
                                className="text-sm tracking-wide text-[hsl(var(--muted-foreground))]"
                                style={{ fontFamily: "var(--font-serif)" }}
                            >
                                ZRATA-X
                            </span>
                        </div>
                        <nav className="flex-1 px-3 py-4 space-y-0.5">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-gentle",
                                        pathname === item.href
                                            ? "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]"
                                            : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>

            {/* ── Main Content ── */}
            <main className="flex-1 pt-12 lg:pt-0 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-5 py-8 md:px-8 md:py-10 relative z-10">
                    {children}
                </div>
            </main>

            <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
        </div>
    );
}