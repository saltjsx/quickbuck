"use client";

import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatCurrency, formatCompactCurrency } from "~/lib/game-utils";

interface PlayerStatsProps {
  balance: number;
  netWorth: number;
  isLoading?: boolean;
}

export function PlayerStats({
  balance,
  netWorth,
  isLoading,
}: PlayerStatsProps) {
  const portfolioValue = netWorth - balance; // Net worth minus cash = portfolio value

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCompactCurrency(balance)}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(balance)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCompactCurrency(netWorth)}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(netWorth)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCompactCurrency(portfolioValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Stocks + Crypto + Equity
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
