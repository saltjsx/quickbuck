"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatCurrency, formatCompactCurrency } from "~/lib/game-utils";

interface NetWorthBreakdownProps {
  cash: number;
  stocksValue: number;
  cryptoValue: number;
  companyEquity: number;
  isLoading?: boolean;
}

export function NetWorthBreakdown({
  cash,
  stocksValue,
  cryptoValue,
  companyEquity,
  isLoading,
}: NetWorthBreakdownProps) {
  const total = cash + stocksValue + cryptoValue + companyEquity;

  const components = [
    {
      label: "Cash",
      value: cash,
      color: "bg-green-500",
      percentage: total > 0 ? (cash / total) * 100 : 0,
    },
    {
      label: "Stocks",
      value: stocksValue,
      color: "bg-blue-500",
      percentage: total > 0 ? (stocksValue / total) * 100 : 0,
    },
    {
      label: "Crypto",
      value: cryptoValue,
      color: "bg-purple-500",
      percentage: total > 0 ? (cryptoValue / total) * 100 : 0,
    },
    {
      label: "Company Equity",
      value: companyEquity,
      color: "bg-orange-500",
      percentage: total > 0 ? (companyEquity / total) * 100 : 0,
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Horizontal Stacked Bar */}
        <div className="flex h-8 w-full overflow-hidden rounded-md">
          {components.map((component) =>
            component.percentage > 0 ? (
              <div
                key={component.label}
                className={component.color}
                style={{ width: `${component.percentage}%` }}
                title={`${component.label}: ${formatCurrency(component.value)}`}
              />
            ) : null
          )}
        </div>

        {/* Legend with values */}
        <div className="grid grid-cols-2 gap-4">
          {components.map((component) => (
            <div key={component.label} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-sm ${component.color}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">{component.label}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCompactCurrency(component.value)} (
                  {component.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t pt-4">
          <div className="flex justify-between text-sm font-semibold">
            <span>Total Net Worth</span>
            <span>{formatCompactCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
