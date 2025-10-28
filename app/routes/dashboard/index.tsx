"use client";

import { useAuth } from "@clerk/react-router";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "convex/_generated/api";
import { CountdownTimer } from "~/components/dashboard/countdown-timer";
import { NetWorthBreakdown } from "~/components/dashboard/net-worth-breakdown";
import { DashboardHero } from "~/components/dashboard/modern/hero";
import { StatsCards } from "~/components/dashboard/modern/stats-cards";
import { Insights } from "~/components/dashboard/modern/insights";
import { NetWorthBreakdownModern } from "~/components/dashboard/modern/net-worth-breakdown-modern";
import { QuickActionsModern } from "~/components/dashboard/modern/quick-actions-modern";
import { RecentTransactionsModern } from "~/components/dashboard/modern/recent-transactions-modern";
import { usePlayerData } from "~/hooks/use-player-data";

export default function DashboardPage() {
  const { userId } = useAuth();
  const {
    player,
    balance,
    netWorth,
    stocksValue,
    cryptoValue,
    companyEquity,
    transactions,
    isLoading,
  } = usePlayerData(userId || null);

  // Get the last tick timestamp from the backend
  const lastTick = useQuery(api.tick.getLastTick);
  const lastTickTime = lastTick?.timestamp;
  const statsRef = useRef<HTMLDivElement | null>(null);
  const [statsHeight, setStatsHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = statsRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // set initial
    setStatsHeight(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(() => {
      setStatsHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-5 p-4 md:gap-7 md:p-6">
          {/* Modern hero header */}
          <DashboardHero
            balance={balance}
            netWorth={netWorth}
            lastTickTime={lastTickTime}
          />

          {/* Stat cards + timer */}
          <div className="grid gap-4 md:grid-cols-4 items-stretch">
            <div
              className="md:col-span-3"
              ref={(el) => {
                statsRef.current = el;
              }}
            >
              <StatsCards balance={balance} netWorth={netWorth} />
            </div>
            <div className="h-full">
              <CountdownTimer
                lastTickTime={lastTickTime}
                heightPx={statsHeight}
              />
            </div>
          </div>

          {/* Insights */}
          <Insights
            cash={balance}
            stocksValue={stocksValue}
            cryptoValue={cryptoValue}
            companyEquity={companyEquity}
            netWorth={netWorth}
          />

          {/* Net Worth Breakdown (modern stacked with subtle animation) */}
          <NetWorthBreakdownModern
            cash={balance}
            stocksValue={stocksValue}
            cryptoValue={cryptoValue}
            companyEquity={companyEquity}
            isLoading={isLoading}
          />

          {/* Quick Actions */}
          <QuickActionsModern />

          {/* Recent Transactions */}
          <RecentTransactionsModern
            transactions={transactions}
            playerId={player?._id}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
