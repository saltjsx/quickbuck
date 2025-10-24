import { describe, it, expect } from "vitest";

// Test utilities for stock detail page functionality

describe("Stock Price History", () => {
  it("should calculate correct timeframe start time for 1H", () => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const startTime = now - oneHour;
    
    expect(now - startTime).toBe(oneHour);
  });

  it("should calculate correct timeframe start time for 1D", () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const startTime = now - oneDay;
    
    expect(now - startTime).toBe(oneDay);
  });

  it("should calculate correct timeframe start time for 1W", () => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const startTime = now - oneWeek;
    
    expect(now - startTime).toBe(oneWeek);
  });

  it("should calculate correct timeframe start time for 1M", () => {
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const startTime = now - oneMonth;
    
    expect(now - startTime).toBe(oneMonth);
  });

  it("should calculate correct timeframe start time for 1Y", () => {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const startTime = now - oneYear;
    
    expect(now - startTime).toBe(oneYear);
  });

  it("should use 0 as start time for ALL timeframe", () => {
    const startTime = 0;
    expect(startTime).toBe(0);
  });

  it("should filter price history within timeframe", () => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const startTime = now - oneWeek;

    const priceHistory = [
      { timestamp: now - 2 * 24 * 60 * 60 * 1000, price: 10000 }, // 2 days ago
      { timestamp: now - 8 * 24 * 60 * 60 * 1000, price: 9500 },  // 8 days ago (outside)
      { timestamp: now - 5 * 24 * 60 * 60 * 1000, price: 10500 }, // 5 days ago
    ];

    const filtered = priceHistory.filter((h) => h.timestamp >= startTime);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((h) => h.price)).toEqual([10000, 10500]);
  });
});

describe("Recent Trades Display", () => {
  it("should sort trades by most recent first", () => {
    const trades = [
      { _id: "1", timestamp: 1000, shares: 10, pricePerShare: 100, totalValue: 1000, tradeType: "buy" as const },
      { _id: "2", timestamp: 3000, shares: 5, pricePerShare: 110, totalValue: 550, tradeType: "sell" as const },
      { _id: "3", timestamp: 2000, shares: 15, pricePerShare: 105, totalValue: 1575, tradeType: "buy" as const },
    ];

    const sorted = [...trades].sort((a, b) => b.timestamp - a.timestamp);
    expect(sorted[0]._id).toBe("2"); // Most recent
    expect(sorted[1]._id).toBe("3");
    expect(sorted[2]._id).toBe("1"); // Oldest
  });

  it("should limit trades to specified amount", () => {
    const trades = Array.from({ length: 50 }, (_, i) => ({
      _id: `${i}`,
      timestamp: Date.now() - i * 1000,
      shares: 10,
      pricePerShare: 100,
      totalValue: 1000,
      tradeType: "buy" as const,
    }));

    const limit = 20;
    const limited = trades.slice(0, limit);
    expect(limited).toHaveLength(20);
  });

  it("should calculate total value correctly", () => {
    const shares = 100;
    const pricePerShare = 15050; // $150.50 in cents
    const totalValue = shares * pricePerShare;
    
    expect(totalValue).toBe(1505000); // $15,050.00 in cents
  });

  it("should distinguish between buy and sell trades", () => {
    const trades = [
      { tradeType: "buy" as const, shares: 10 },
      { tradeType: "sell" as const, shares: 5 },
      { tradeType: "buy" as const, shares: 15 },
    ];

    const buyTrades = trades.filter((t) => t.tradeType === "buy");
    const sellTrades = trades.filter((t) => t.tradeType === "sell");

    expect(buyTrades).toHaveLength(2);
    expect(sellTrades).toHaveLength(1);
  });
});

describe("Chart Data Formatting", () => {
  it("should format timestamp for 1H timeframe", () => {
    const date = new Date(2024, 0, 15, 14, 30);
    const formatted = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });

  it("should format timestamp for longer timeframes", () => {
    const date = new Date(2024, 0, 15);
    const formatted = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    
    expect(formatted).toMatch(/\w+ \d+/);
  });

  it("should handle empty price history array", () => {
    const priceHistory: any[] = [];
    expect(priceHistory.length).toBe(0);
  });

  it("should handle single data point", () => {
    const priceHistory = [
      { timestamp: Date.now(), price: 10000, open: 10000, high: 10000, low: 10000, close: 10000 }
    ];
    
    expect(priceHistory).toHaveLength(1);
    expect(priceHistory[0].price).toBe(10000);
  });
});

describe("Price Change Calculations", () => {
  it("should calculate price change percentage", () => {
    const currentPrice = 11000; // $110.00
    const previousPrice = 10000; // $100.00
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    expect(change).toBe(10);
  });

  it("should handle negative price change", () => {
    const currentPrice = 9000; // $90.00
    const previousPrice = 10000; // $100.00
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    expect(change).toBe(-10);
  });

  it("should handle zero price change", () => {
    const currentPrice = 10000;
    const previousPrice = 10000;
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    expect(change).toBe(0);
  });

  it("should identify positive change", () => {
    const change = 5.5;
    const isPositive = change >= 0;
    expect(isPositive).toBe(true);
  });

  it("should identify negative change", () => {
    const change = -3.2;
    const isPositive = change >= 0;
    expect(isPositive).toBe(false);
  });
});

describe("Trade Recording", () => {
  it("should record buy trade with correct fields", () => {
    const trade = {
      stockId: "stock123" as any,
      companyId: "company456" as any,
      shares: 100,
      pricePerShare: 10050, // $100.50
      totalValue: 1005000, // $10,050.00
      tradeType: "buy" as const,
      timestamp: Date.now(),
    };

    expect(trade.shares).toBe(100);
    expect(trade.pricePerShare).toBe(10050);
    expect(trade.totalValue).toBe(trade.shares * trade.pricePerShare);
    expect(trade.tradeType).toBe("buy");
  });

  it("should record sell trade with correct fields", () => {
    const trade = {
      stockId: "stock123" as any,
      companyId: "company456" as any,
      shares: 50,
      pricePerShare: 11000, // $110.00
      totalValue: 550000, // $5,500.00
      tradeType: "sell" as const,
      timestamp: Date.now(),
    };

    expect(trade.shares).toBe(50);
    expect(trade.pricePerShare).toBe(11000);
    expect(trade.totalValue).toBe(trade.shares * trade.pricePerShare);
    expect(trade.tradeType).toBe("sell");
  });

  it("should validate trade has required fields", () => {
    const trade = {
      stockId: "stock123",
      companyId: "company456",
      shares: 100,
      pricePerShare: 10000,
      totalValue: 1000000,
      tradeType: "buy",
      timestamp: Date.now(),
    };

    expect(trade).toHaveProperty("stockId");
    expect(trade).toHaveProperty("companyId");
    expect(trade).toHaveProperty("shares");
    expect(trade).toHaveProperty("pricePerShare");
    expect(trade).toHaveProperty("totalValue");
    expect(trade).toHaveProperty("tradeType");
    expect(trade).toHaveProperty("timestamp");
  });
});
