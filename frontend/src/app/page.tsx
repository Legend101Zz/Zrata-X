"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";

// ── Narrative sections — the user's own story ──
const STORY_SECTIONS = [
  {
    text: (
      <>
        Every month, the same ritual. Salary hits the account. I stare at it.
        I <em>know</em> I should invest. I understand the basics — mutual funds,
        gold, FDs, ETFs. But somehow, I end up doing{" "}
        <strong>nothing</strong>.
      </>
    ),
  },
  {
    text: (
      <>
        Not because I'm lazy. Because I'm{" "}
        <em>overwhelmed</em>. How much into equity this month? Is the market
        too high? Which bank has the best FD rate this week? Does my portfolio
        need rebalancing? I don't have hours to research this.
      </>
    ),
  },
  {
    text: (
      <>
        Existing apps are great at <em>execution</em> — buying the asset.
        But terrible at <em>advisory</em> — telling me{" "}
        <strong>what</strong> to buy, <strong>how much</strong>, based on what I{" "}
        <em>already own</em>.
      </>
    ),
  },
  {
    text: (
      <>
        I needed something simpler. A system that knows my history, scans the
        market for me, and just hands me a{" "}
        <strong>shopping list for the month</strong>.
      </>
    ),
  },
];

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const { setGuest } = useAuthStore();
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const isRevealInView = useInView(revealRef, { once: true, amount: 0.3 });

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  const handleGuest = () => {
    setGuest();
    router.push("/dashboard");
  };

  return (
    <div className="relative">
      {/* ── Minimal header — just the mark ── */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[hsl(var(--background)/0.7)]">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center">
              <span className="font-bold text-[hsl(var(--primary-foreground))] text-xs tracking-tight">
                Z
              </span>
            </div>
            <span
              className="text-sm font-medium tracking-wide text-[hsl(var(--muted-foreground))]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              ZRATA-X
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogin(true)}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* ── HERO: The Question ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-6">
        {/* Ambient radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 40%, hsl(38 92% 50% / 0.04), transparent)",
          }}
        />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 max-w-2xl text-center"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--primary))] mb-8"
          >
            The Passive Compounder
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-4xl md:text-6xl lg:text-7xl font-light leading-[1.1] tracking-tight mb-8"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            I have <span className="text-[hsl(var(--primary))]">₹X</span> this
            month.
            <br />
            <span className="text-[hsl(var(--muted-foreground))]">
              How should I split it?
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="text-[hsl(var(--muted-foreground))] text-base md:text-lg max-w-md mx-auto leading-relaxed"
          >
            Given what you already own, inflation, and current market
            conditions — Zrata-X helps you decide, calmly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.4 }}
            className="mt-12"
          >
            <ArrowDown className="h-5 w-5 text-[hsl(var(--muted-foreground)/0.4)] mx-auto animate-bounce" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── NARRATIVE: The Story ── */}
      <section className="relative max-w-xl mx-auto px-6 py-20 space-y-24 md:space-y-32">
        {STORY_SECTIONS.map((section, i) => (
          <NarrativeParagraph key={i} index={i}>
            {section.text}
          </NarrativeParagraph>
        ))}
      </section>

      {/* ── REVEAL: The Product ── */}
      <section ref={revealRef} className="relative py-32 px-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, hsl(38 92% 50% / 0.06), transparent)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isRevealInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-lg mx-auto text-center"
        >
          <p
            className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--primary))] mb-6"
          >
            So I built it
          </p>

          <h2
            className="text-3xl md:text-5xl font-light mb-6"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Monthly investing,
            <br />
            <span className="text-[hsl(var(--primary))]">made calm.</span>
          </h2>

          <p className="text-[hsl(var(--muted-foreground))] leading-relaxed mb-4">
            Zrata-X scans FD rates, gold prices, mutual fund performance,
            macro signals, and news — then gives you a calm, portfolio-aware
            split for the month.
          </p>
          <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed mb-12">
            No charts. No jargon. No urgency. Just a clear shopping list.
          </p>

          {/* ── How it works — 3 steps ── */}
          <div className="grid gap-6 text-left mb-16">
            {[
              {
                step: "01",
                title: "Tell it your budget",
                desc: "I have ₹50,000 this month.",
              },
              {
                step: "02",
                title: "It reads the room",
                desc: "Market signals, your portfolio gaps, macro trends — all pre-processed.",
              },
              {
                step: "03",
                title: "You get a shopping list",
                desc: "₹25K in Flexi Cap SIP, ₹15K in Utkarsh SFB FD at 8.5%, ₹10K in Gold ETF.",
              },
            ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={isRevealInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
              className="flex gap-4 items-start"
            >
              <span
                className="text-xs font-mono text-[hsl(var(--primary)/0.6)] pt-1 shrink-0"
              >
                {item.step}
              </span>
              <div>
                <p className="text-[hsl(var(--foreground))] font-medium text-sm mb-0.5">
                  {item.title}
                </p>
                <p className="text-[hsl(var(--muted-foreground))] text-sm">
                  {item.desc}
                </p>
              </div>
            </motion.div>
            ))}
          </div>

          {/* ── CTA ── */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={handleGuest}
              className="amber-glow bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(38_92%_55%)] font-medium text-sm px-8"
            >
              Try without signing up
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowLogin(true)}
              className="text-sm border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--muted-foreground)/0.3)]"
            >
              Sign in
            </Button>
          </div>

          <p className="text-[10px] text-[hsl(var(--muted-foreground)/0.5)] mt-8">
            Educational tool for informed decisions. Not investment advice.
          </p>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[hsl(var(--border))] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[hsl(var(--muted-foreground)/0.4)]">
            Zrata-X — The Passive Compounder
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground)/0.3)]">
            India-first. Portfolio-aware. Calm.
          </p>
        </div>
      </footer>

      <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </div>
  );
}

/* ── Narrative paragraph with scroll-triggered fade ── */
function NarrativeParagraph({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.p
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="narrative-text"
    >
      {children}
    </motion.p>
  );
}