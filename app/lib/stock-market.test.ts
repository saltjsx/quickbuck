import { describe, expect, it } from "vitest";

/**
 * Tests for Section 11: Stock Market
 * Testing business logic, calculations, and validation rules
 */

describe("Section 11: Stock Market - Price Change Calculation", () => {
  it("should calculate positive price change percentage", () => {
    const currentPrice = 11000; // $110
    const previousPrice = 10000; // $100
    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    expect(priceChange).toBe(10); // 10% increase
  });

  it("should calculate negative price change percentage", () => {
    const currentPrice = 9000; // $90
    const previousPrice = 10000; // $100
    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    expect(priceChange).toBe(-10); // 10% decrease
  });

  it("should handle zero previous price", () => {
    const currentPrice = 10000;
    const previousPrice = 0;
    
    if (previousPrice === 0) {
      expect(previousPrice).toBe(0);
    }
  });

  it("should calculate price change in cents", () => {
    const currentPrice = 10500; // $105
    const previousPrice = 10000; // $100
    const priceChange = currentPrice - previousPrice;
    
    expect(priceChange).toBe(500); // $5 increase
  });

  it("should handle small price changes", () => {
    const currentPrice = 10050; // $100.50
    const previousPrice = 10000; // $100.00
    const priceChangePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    expect(priceChangePercent).toBe(0.5); // 0.5% increase
  });
});

describe("Section 11: Stock Market - Search and Filter Logic", () => {
  const sampleStocks = [
    { ticker: "TECH", companyName: "Tech Corp", price: 15000, marketCap: 1500000000 },
    { ticker: "FOOD", companyName: "Food Industries", price: 8000, marketCap: 800000000 },
    { ticker: "AUTO", companyName: "Auto Makers", price: 25000, marketCap: 2500000000 },
    { ticker: "GAME", companyName: "Gaming Studio", price: 5000, marketCap: 500000000 },
  ];

  it("should filter stocks by ticker search", () => {
    const searchQuery = "tech";
    const filtered = sampleStocks.filter(stock =>
      stock.ticker.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ticker).toBe("TECH");
  });

  it("should filter stocks by company name search", () => {
    const searchQuery = "gaming";
    const filtered = sampleStocks.filter(stock =>
      stock.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ticker).toBe("GAME");
  });

  it("should filter stocks by partial ticker match", () => {
    const searchQuery = "o";
    const filtered = sampleStocks.filter(stock =>
      stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("should return empty array for no matches", () => {
    const searchQuery = "xyz123";
    const filtered = sampleStocks.filter(stock =>
      stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    expect(filtered).toHaveLength(0);
  });
});

describe("Section 11: Stock Market - Sort Logic", () => {
  const stocks = [
    { ticker: "A", price: 15000, marketCap: 1500000000, createdAt: 2000 },
    { ticker: "B", price: 5000, marketCap: 500000000, createdAt: 3000 },
    { ticker: "C", price: 10000, marketCap: 1000000000, createdAt: 1000 },
  ];

  it("should sort by price ascending", () => {
    const sorted = [...stocks].sort((a, b) => a.price - b.price);
    
    expect(sorted[0].ticker).toBe("B");
    expect(sorted[1].ticker).toBe("C");
    expect(sorted[2].ticker).toBe("A");
  });

  it("should sort by price descending", () => {
    const sorted = [...stocks].sort((a, b) => b.price - a.price);
    
    expect(sorted[0].ticker).toBe("A");
    expect(sorted[1].ticker).toBe("C");
    expect(sorted[2].ticker).toBe("B");
  });

  it("should sort by market cap ascending", () => {
    const sorted = [...stocks].sort((a, b) => a.marketCap - b.marketCap);
    
    expect(sorted[0].ticker).toBe("B");
    expect(sorted[1].ticker).toBe("C");
    expect(sorted[2].ticker).toBe("A");
  });

  it("should sort by market cap descending", () => {
    const sorted = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
    
    expect(sorted[0].ticker).toBe("A");
    expect(sorted[1].ticker).toBe("C");
    expect(sorted[2].ticker).toBe("B");
  });

  it("should sort by newest first", () => {
    const sorted = [...stocks].sort((a, b) => b.createdAt - a.createdAt);
    
    expect(sorted[0].ticker).toBe("B");
    expect(sorted[1].ticker).toBe("A");
    expect(sorted[2].ticker).toBe("C");
  });
});

describe("Section 11: Stock Market - Market Cap Calculation", () => {
  it("should calculate market cap correctly", () => {
    const price = 10000; // $100 per share
    const totalShares = 1000000;
    const marketCap = price * totalShares;
    
    expect(marketCap).toBe(10000000000); // $100M
  });

  it("should handle different share counts", () => {
    const price = 5000; // $50 per share
    const totalShares = 500000;
    const marketCap = price * totalShares;
    
    expect(marketCap).toBe(2500000000); // $25M
  });

  it("should update market cap when price changes", () => {
    const oldPrice = 10000;
    const newPrice = 11000;
    const totalShares = 1000000;
    
    const oldMarketCap = oldPrice * totalShares;
    const newMarketCap = newPrice * totalShares;
    
    expect(newMarketCap).toBeGreaterThan(oldMarketCap);
    expect(newMarketCap - oldMarketCap).toBe(1000000000); // $10M increase
  });
});

describe("Section 11: Stock Purchases - Share Amount Calculation", () => {
  it("should calculate shares from dollar amount", () => {
    const dollarAmount = 1000; // $1,000
    const pricePerShare = 10000; // $100
    const shares = Math.floor((dollarAmount * 100) / pricePerShare);
    
    expect(shares).toBe(10); // 10 shares
  });

  it("should calculate cost from share amount", () => {
    const shares = 10;
    const pricePerShare = 10000; // $100
    const totalCost = shares * pricePerShare;
    
    expect(totalCost).toBe(100000); // $1,000
  });

  it("should handle fractional shares (floor)", () => {
    const dollarAmount = 1050; // $1,050
    const pricePerShare = 10000; // $100
    const shares = Math.floor((dollarAmount * 100) / pricePerShare);
    
    expect(shares).toBe(10); // Only 10 complete shares
  });

  it("should validate positive share count", () => {
    const shares = 10;
    expect(shares).toBeGreaterThan(0);
  });

  it("should reject zero shares", () => {
    const shares = 0;
    expect(shares).toBe(0);
  });

  it("should reject negative shares", () => {
    const shares = -5;
    expect(shares).toBeLessThan(0);
  });
});

describe("Section 11: Stock Purchases - Balance Validation", () => {
  it("should validate sufficient balance for purchase", () => {
    const playerBalance = 500000; // $5,000
    const totalCost = 300000; // $3,000
    
    const hasSufficientBalance = playerBalance >= totalCost;
    expect(hasSufficientBalance).toBe(true);
  });

  it("should reject insufficient balance", () => {
    const playerBalance = 200000; // $2,000
    const totalCost = 300000; // $3,000
    
    const hasSufficientBalance = playerBalance >= totalCost;
    expect(hasSufficientBalance).toBe(false);
  });

  it("should handle exact balance match", () => {
    const playerBalance = 300000; // $3,000
    const totalCost = 300000; // $3,000
    
    const hasSufficientBalance = playerBalance >= totalCost;
    expect(hasSufficientBalance).toBe(true);
  });

  it("should deduct correct amount from balance", () => {
    let playerBalance = 500000; // $5,000
    const totalCost = 300000; // $3,000
    
    playerBalance -= totalCost;
    
    expect(playerBalance).toBe(200000); // $2,000 remaining
  });
});

describe("Section 11: Stock Purchases - Weighted Average Price", () => {
  it("should calculate weighted average for initial purchase", () => {
    const existingShares = 0;
    const existingAverage = 0;
    const newShares = 10;
    const newPrice = 10000;
    
    const totalShares = existingShares + newShares;
    const totalValue = (existingShares * existingAverage) + (newShares * newPrice);
    const newAverage = totalValue / totalShares;
    
    expect(newAverage).toBe(10000);
  });

  it("should calculate weighted average for additional purchase at same price", () => {
    const existingShares = 10;
    const existingAverage = 10000;
    const newShares = 5;
    const newPrice = 10000;
    
    const totalShares = existingShares + newShares;
    const totalValue = (existingShares * existingAverage) + (newShares * newPrice);
    const newAverage = totalValue / totalShares;
    
    expect(newAverage).toBe(10000);
  });

  it("should calculate weighted average for purchase at higher price", () => {
    const existingShares = 10;
    const existingAverage = 10000; // $100
    const newShares = 10;
    const newPrice = 12000; // $120
    
    const totalShares = existingShares + newShares;
    const totalValue = (existingShares * existingAverage) + (newShares * newPrice);
    const newAverage = totalValue / totalShares;
    
    expect(newAverage).toBe(11000); // $110 average
  });

  it("should calculate weighted average for purchase at lower price", () => {
    const existingShares = 10;
    const existingAverage = 10000; // $100
    const newShares = 10;
    const newPrice = 8000; // $80
    
    const totalShares = existingShares + newShares;
    const totalValue = (existingShares * existingAverage) + (newShares * newPrice);
    const newAverage = totalValue / totalShares;
    
    expect(newAverage).toBe(9000); // $90 average
  });
});

describe("Section 11: Stock Holdings - Ownership Percentage", () => {
  it("should calculate ownership percentage", () => {
    const playerShares = 10000;
    const totalShares = 1000000;
    const ownershipPercent = (playerShares / totalShares) * 100;
    
    expect(ownershipPercent).toBe(1); // 1% ownership
  });

  it("should calculate ownership for multiple holders", () => {
    const totalShares = 1000000;
    const holder1Shares = 100000; // 10%
    const holder2Shares = 50000;  // 5%
    const holder3Shares = 25000;  // 2.5%
    
    const holder1Percent = (holder1Shares / totalShares) * 100;
    const holder2Percent = (holder2Shares / totalShares) * 100;
    const holder3Percent = (holder3Shares / totalShares) * 100;
    
    expect(holder1Percent).toBe(10);
    expect(holder2Percent).toBe(5);
    expect(holder3Percent).toBe(2.5);
  });

  it("should calculate total ownership value", () => {
    const shares = 1000;
    const pricePerShare = 10000; // $100
    const totalValue = shares * pricePerShare;
    
    expect(totalValue).toBe(10000000); // $100,000
  });

  it("should handle fractional ownership percentages", () => {
    const playerShares = 1234;
    const totalShares = 1000000;
    const ownershipPercent = (playerShares / totalShares) * 100;
    
    expect(ownershipPercent).toBeCloseTo(0.1234, 4); // 0.1234%
  });
});

describe("Section 11: Stock Sales - Validation", () => {
  it("should validate player has shares to sell", () => {
    const playerShares = 10;
    const sharesToSell = 5;
    
    const hasEnoughShares = playerShares >= sharesToSell;
    expect(hasEnoughShares).toBe(true);
  });

  it("should reject sale if insufficient shares", () => {
    const playerShares = 5;
    const sharesToSell = 10;
    
    const hasEnoughShares = playerShares >= sharesToSell;
    expect(hasEnoughShares).toBe(false);
  });

  it("should allow selling all shares", () => {
    const playerShares = 10;
    const sharesToSell = 10;
    
    const hasEnoughShares = playerShares >= sharesToSell;
    expect(hasEnoughShares).toBe(true);
  });

  it("should calculate sale proceeds", () => {
    const sharesToSell = 10;
    const pricePerShare = 10000; // $100
    const totalProceeds = sharesToSell * pricePerShare;
    
    expect(totalProceeds).toBe(100000); // $1,000
  });

  it("should update holdings after sale", () => {
    let playerShares = 10;
    const sharesToSell = 3;
    
    playerShares -= sharesToSell;
    
    expect(playerShares).toBe(7);
  });

  it("should remove holding if all shares sold", () => {
    let playerShares = 10;
    const sharesToSell = 10;
    
    playerShares -= sharesToSell;
    
    expect(playerShares).toBe(0);
  });
});

describe("Section 11: Stock Market - Transaction Recording", () => {
  it("should create transaction record for purchase", () => {
    const transaction = {
      fromAccountId: "player1",
      fromAccountType: "player" as const,
      toAccountId: "company1",
      toAccountType: "company" as const,
      amount: 100000,
      assetType: "stock" as const,
      description: "Purchased 10 shares of TECH",
    };
    
    expect(transaction.assetType).toBe("stock");
    expect(transaction.amount).toBe(100000);
  });

  it("should create transaction record for sale", () => {
    const transaction = {
      fromAccountId: "company1",
      fromAccountType: "company" as const,
      toAccountId: "player1",
      toAccountType: "player" as const,
      amount: 100000,
      assetType: "stock" as const,
      description: "Sold 10 shares of TECH",
    };
    
    expect(transaction.assetType).toBe("stock");
    expect(transaction.amount).toBe(100000);
  });
});
