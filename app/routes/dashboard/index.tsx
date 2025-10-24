"use client";

import { useAuth } from "@clerk/react-router";
import { PlayerStats } from "~/components/dashboard/player-stats";
import { CountdownTimer } from "~/components/dashboard/countdown-timer";
import { QuickActions } from "~/components/dashboard/quick-actions";
import { RecentTransactions } from "~/components/dashboard/recent-transactions";
import { NetWorthBreakdown } from "~/components/dashboard/net-worth-breakdown";
import { usePlayerData } from "~/hooks/use-player-data";

export default function DashboardPage() {
  const { userId } = useAuth();
  const { player, balance, netWorth, transactions, isLoading } = usePlayerData(
    userId || null
  );

  // For now, assume tick just happened (will implement tick history later)
  const lastTickTime = Date.now();

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your game overview.
            </p>
          </div>

          {/* Stats and Timer Row */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-3">
              <PlayerStats
                balance={balance}
                netWorth={netWorth}
                isLoading={isLoading}
              />
            </div>
            <div>
              <CountdownTimer lastTickTime={lastTickTime} />
            </div>
          </div>

          {/* Net Worth Breakdown */}
          <NetWorthBreakdown
            cash={balance}
            stocksValue={0} // TODO: Calculate from holdings
            cryptoValue={0} // TODO: Calculate from holdings
            companyEquity={0} // TODO: Calculate from company ownership
            isLoading={isLoading}
          />

          {/* Quick Actions */}
          <QuickActions />

          {/* Recent Transactions */}
          <RecentTransactions
            transactions={transactions}
            playerId={player?._id}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
