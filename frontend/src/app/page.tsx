"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield, TrendingUp, Wallet, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const { setGuest } = useAuthStore();
  const router = useRouter();

  const handleContinueAsGuest = () => {
    setGuest();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground text-sm">Z</span>
            </div>
            <span className="font-semibold text-lg">Zrata-X</span>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowLogin(true)}
            className="border-border hover:bg-secondary"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-16">
        <section className="container mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <Zap className="h-4 w-4 text-primary" />
              The Passive Compounder
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Monthly investing,{" "}
              <span className="text-primary">made calm.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              You have ₹X this month. Given what you already own, inflation, and
              current market conditions — Zrata-X helps you split it calmly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button
                size="lg"
                onClick={handleContinueAsGuest}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                Start Exploring
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowLogin(true)}
                className="w-full sm:w-auto"
              >
                Sign In to Track
              </Button>
            </div>

            {/* Guest Mode Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="p-4 rounded-lg bg-secondary/30 border border-border inline-block"
            >
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">No sign-up needed to explore.</span>
                <br />
                Sign in later to track your assets and build context over time.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16 border-t border-border">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon={<Wallet className="h-6 w-6" />}
              title="Portfolio-Aware"
              description="Recommendations factor in what you already own. No blind suggestions."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Market-Aware"
              description="Current FD rates, inflation data, and yields — all considered automatically."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="No Advice, Just Data"
              description="Educational tool for informed decisions. You're always in control."
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-12">
              How it works
            </h2>
            <div className="space-y-6">
              <Step
                number={1}
                title="Tell us your monthly amount"
                description="How much can you invest this month?"
              />
              <Step
                number={2}
                title="See calm allocation suggestions"
                description="Based on your risk comfort and current holdings."
              />
              <Step
                number={3}
                title="Execute anywhere you like"
                description="We don't hold your money. Use your preferred broker or bank."
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>
              Zrata-X is an educational decision-support tool, not investment
              advice.
            </p>
            <p className="mt-2">Built for Indian working professionals.</p>
          </div>
        </footer>
      </main>

      <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="p-6 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-gentle"
    >
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </motion.div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: number * 0.1 }}
      className="flex items-start gap-4"
    >
      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-mono text-sm flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}