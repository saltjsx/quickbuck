import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
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
import type { Id } from "convex/_generated/dataModel";

interface CryptoPriceChartProps {
  cryptoId: Id<"cryptocurrencies">;
  currentPrice: number;
  symbol: string;
  height?: number;
  showStats?: boolean;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
  displayTime: string;
}

export function CryptoPriceChart({
  cryptoId,
  currentPrice,
  symbol,
  height = 320,
  showStats = true,
}: CryptoPriceChartProps) {
  // Fetch actual price history from database
  const priceHistoryRaw = useQuery(api.crypto.getPriceHistory, {
    cryptoId,
    limit: 168, // ~7 days of hourly data
  });

  // Transform database data to chart format
  const data: ChartDataPoint[] = [];
  if (priceHistoryRaw && priceHistoryRaw.length > 0) {
    // Sort by timestamp ascending (oldest first)
    const sorted = [...priceHistoryRaw].reverse();

    sorted.forEach((item) => {
      const date = new Date(item.timestamp);
      data.push({
        timestamp: item.timestamp,
        price: item.close ?? item.open ?? currentPrice, // Use close if available, fall back to open
        displayTime: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    });
  }

  // If no data, show current price as a single point
  if (data.length === 0) {
    const now = new Date();
    data.push({
      timestamp: Date.now(),
      price: currentPrice,
      displayTime: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    });
  }

  // Calculate statistics
  const prices = data.map((d) => d.price);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;
  const change = prices[prices.length - 1] - prices[0];
  const changePercent = (change / prices[0]) * 100;

  const isPositive = change >= 0;
  const textColor = isPositive ? "#10b981" : "#ef4444"; // Green or red

  return (
    <div className="w-full space-y-3">
      {showStats && (
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground">High</div>
            <div className="font-semibold">{formatCurrency(high)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Low</div>
            <div className="font-semibold">{formatCurrency(low)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg</div>
            <div className="font-semibold">{formatCurrency(average)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Change</div>
            <div
              className={`font-semibold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : ""}
              {changePercent.toFixed(2)}%
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
            tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "0.5rem",
              padding: "0.75rem",
            }}
            labelStyle={{ color: "#e5e7eb" }}
            formatter={(value: any) => [formatCurrency(value), symbol]}
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
