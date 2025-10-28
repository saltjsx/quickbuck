"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";

type HeroProps = {
  balance: number;
  netWorth: number;
  lastTickTime?: number;
};

export function DashboardHero({ balance, netWorth }: HeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-6 py-8 text-white shadow-sm">
      <div className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_0%,#000_30%,transparent_70%)]">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-lg font-medium text-zinc-300">Overview</h2>
          <div className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            <AnimatedNumber
              value={netWorth}
              compact={false}
              prefix="Net Worth: "
            />
          </div>
          <div className="mt-2 text-sm text-zinc-300">
            Cash on hand:
            <span className="ml-2 font-semibold">
              <AnimatedNumber value={balance} />
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="flex gap-3"
        >
          <Link to="/stocks">
            <Button
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Trade Stocks
            </Button>
          </Link>
          <Link to="/crypto">
            <Button
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Trade Crypto
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
