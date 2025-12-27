"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    Wallet,
    PieChart,
    Settings,
    Menu,
    X,
    LogOut,
    User,
    HelpCircle,
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
    { href: "/dashboard/portfolio", icon: Wallet, label: "My Holdings" },
    { href: "/dashboard/allocate", icon: PieChart, label: "Allocate" },
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
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50">
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="font-bold text-primary-foreground text-sm">Z</span>
                        </div>
                        <span className="font-semibold text-lg">Zrata-X</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            isActive={pathname === item.href}
                        />
                    ))}
                </nav>

                {/* Guest Mode Banner */}
                {isGuest && (
                    <div className="mx-4 mb-4 p-4 rounded-lg bg-secondary/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-2">
                            You're exploring as a guest
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowLogin(true)}
                            className="w-full text-xs"
                        >
                            Sign in to save progress
                        </Button>
                    </div>
                )}

                <div className="p-4 border-t border-border">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 px-3"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                        {user?.name?.[0]?.toUpperCase() || "G"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium truncate">
                                        {user?.name || "Guest"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {user?.email || "Not signed in"}
                                    </p>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            {isAuthenticated ? (
                                <>
                                    <DropdownMenuItem>
                                        <User className="mr-2 h-4 w-4" />
                                        Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout} className="text-destructive">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sign out
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <DropdownMenuItem onClick={() => setShowLogin(true)}>
                                    <User className="mr-2 h-4 w-4" />
                                    Sign in
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-lg flex items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                        <span className="font-bold text-primary-foreground text-xs">Z</span>
                    </div>
                    <span className="font-semibold">Zrata-X</span>
                </Link>

                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <div className="p-6 border-b border-border">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                    <span className="font-bold text-primary-foreground text-sm">Z</span>
                                </div>
                                <span className="font-semibold text-lg">Zrata-X</span>
                            </Link>
                        </div>
                        <nav className="flex-1 px-4 py-4 space-y-1">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={pathname === item.href}
                                    onClick={() => setMobileOpen(false)}
                                />
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Main Content */}
            <main className="flex-1 lg:pt-0 pt-14">
                <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>
            </main>

            <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
        </div>
    );
}

function NavLink({
    href,
    icon: Icon,
    label,
    isActive,
    onClick,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-gentle",
                isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
        >
            <Icon className="h-5 w-5" />
            {label}
        </Link>
    );
}