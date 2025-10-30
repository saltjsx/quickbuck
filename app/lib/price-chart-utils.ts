import { formatCurrency } from "~/lib/game-utils";

export interface ChartDataPoint {
  timestamp: number;
  price: number;
  displayTime: string;
  formattedPrice: string;
}

/**
 * Generates sample price history data for charting
 * Simulates a realistic price movement based on the current price and volatility
 */
export function generatePriceHistory(
  currentPrice: number,
  days: number = 7
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  // Start from 'days' ago
  let price = currentPrice * 0.8; // Assume current price is higher than start
  const volatility = 0.02; // 2% daily volatility
  
  for (let i = days; i >= 1; i--) {
    // Random walk with slight upward drift
    const random = Math.random() - 0.45; // Slight upward bias
    const change = random * volatility;
    price = Math.max(currentPrice * 0.5, price * (1 + change)); // Don't go below 50% of current
    
    const timestamp = now - i * dayMs;
    const date = new Date(timestamp);
    
    data.push({
      timestamp,
      price: Math.round(price * 100) / 100,
      displayTime: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      formattedPrice: formatCurrency(price),
    });
  }
  
  // Always use the actual current price for the final data point (today)
  const date = new Date(now);
  data.push({
    timestamp: now,
    price: currentPrice,
    displayTime: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    formattedPrice: formatCurrency(currentPrice),
  });
  
  return data;
}

/**
 * Generates a smooth curve through the data for a more polished look
 * Preserves the first and last data points to maintain accuracy
 */
export function smoothPriceHistory(data: ChartDataPoint[]): ChartDataPoint[] {
  if (data.length < 3) return data;
  
  const smoothed: ChartDataPoint[] = [data[0]];
  
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1].price;
    const curr = data[i].price;
    const next = data[i + 1].price;
    
    const smoothedPrice = (prev + curr * 2 + next) / 4;
    
    smoothed.push({
      ...data[i],
      price: Math.round(smoothedPrice * 100) / 100,
      formattedPrice: formatCurrency(smoothedPrice),
    });
  }
  
  // Always preserve the last point as-is (current actual price)
  smoothed.push(data[data.length - 1]);
  return smoothed;
}

/**
 * Calculate price statistics
 */
export function calculatePriceStats(data: ChartDataPoint[]) {
  if (data.length === 0) {
    return {
      high: 0,
      low: 0,
      average: 0,
      change: 0,
      changePercent: 0,
    };
  }
  
  const prices = data.map((d) => d.price);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;
  const change = prices[prices.length - 1] - prices[0];
  const changePercent = (change / prices[0]) * 100;
  
  return { high, low, average, change, changePercent };
}
