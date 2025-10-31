import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "~/lib/game-utils";
import {
  generatePriceHistory,
  smoothPriceHistory,
  calculatePriceStats,
} from "~/lib/price-chart-utils";
import { useStockPriceHistory } from "~/hooks/use-stock-price-history";
import type { Id } from "convex/_generated/dataModel";

interface PriceChartProps {
  currentPrice: number;
  symbol: string;
  height?: number;
  showStats?: boolean;
  days?: number;
  stockId?: Id<"stocks"> | null;
}

export function PriceChart({
  currentPrice,
  symbol,
  height = 320,
  showStats = true,
  days = 7,
  stockId,
}: PriceChartProps) {
  // Fetch real price history from database
  const realHistory = useStockPriceHistory(stockId, 100);

  // Use real data if available, otherwise fall back to generated data
  let data;
  if (realHistory && realHistory.length > 0) {
    // Real data is already in cents, use as-is
    data = realHistory;
  } else {
    // Fallback: generate mock data while real data loads
    data = smoothPriceHistory(generatePriceHistory(currentPrice, days, symbol));
  }

  const stats = calculatePriceStats(
    data.map((d) => ({
      timestamp: d.timestamp ?? 0,
      price: d.price,
      displayTime: d.displayTime ?? "",
      formattedPrice: d.formattedPrice ?? "",
    }))
  );

  const isPositive = stats.change >= 0;
  const textColor = isPositive ? "#10b981" : "#ef4444"; // Green or red

  return (
    <div className="w-full space-y-3">
      {showStats && (
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground">High</div>
            <div className="font-semibold">{formatCurrency(stats.high)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Low</div>
            <div className="font-semibold">{formatCurrency(stats.low)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg</div>
            <div className="font-semibold">{formatCurrency(stats.average)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Change</div>
            <div
              className={`font-semibold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : ""}
              {stats.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="displayTime"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            stroke="#e5e7eb"
          />
          <YAxis
            domain={["dataMin - 10", "dataMax + 10"]}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            stroke="#e5e7eb"
            tickFormatter={(value) => `$${(value / 100).toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "0.5rem",
              padding: "0.75rem",
            }}
            labelStyle={{ color: "#e5e7eb" }}
            formatter={(value: any) => [
              `$${(Number(value) / 100).toFixed(2)}`,
              symbol,
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={textColor}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
