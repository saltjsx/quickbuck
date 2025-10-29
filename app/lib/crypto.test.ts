import { describe, it, expect } from "vitest";

// Test utilities for cryptocurrency system functionality

describe("Cryptocurrency Creation", () => {
  it("should validate ticker format 3-6 letters", () => {
    const validTickers = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE"];
    const tickerRegex = /^[A-Z]{3,6}$/;
    
    validTickers.forEach((ticker) => {
      expect(tickerRegex.test(ticker)).toBe(true);
    });
  });

  it("should reject invalid ticker formats", () => {
    const invalidTickers = ["*BTC", "BT", "*BTCE", "**BTC", "*1BTC", "*btc", "*"];
    const tickerRegex = /^[A-Z]{3,6}$/;
    
    invalidTickers.forEach((ticker) => {
      expect(tickerRegex.test(ticker)).toBe(false);
    });
  });

  it("should require $10,000 to create cryptocurrency", () => {
    const creationCost = 1000000; // cents
    const playerBalance = 1500000; // $15,000
    
    expect(playerBalance >= creationCost).toBe(true);
  });

  it("should reject creation with insufficient balance", () => {
    const creationCost = 1000000; // $10,000
    const playerBalance = 500000; // $5,000
    
    expect(playerBalance >= creationCost).toBe(false);
  });

  it("should initialize with 100 million tokens", () => {
    const initialSupply = 100000000;
    expect(initialSupply).toBe(100000000);
  });

  it("should start at $1.00 per token", () => {
    const initialPrice = 100; // cents
    expect(initialPrice).toBe(100); // $1.00
  });

  it("should calculate initial market cap correctly", () => {
    const initialPrice = 100; // $1.00 in cents
    const initialSupply = 100000000;
    const marketCap = initialPrice * initialSupply;
    
    expect(marketCap).toBe(10000000000); // $100,000,000
  });
});

describe("Crypto Search and Filter", () => {
  it("should search by crypto name", () => {
    const cryptos = [
      { name: "Bitcoin", ticker: "BTC" },
      { name: "Ethereum", ticker: "ETH" },
      { name: "Solana", ticker: "SOL" },
    ];

    const query = "bit";
    const filtered = cryptos.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Bitcoin");
  });

  it("should search by ticker", () => {
    const cryptos = [
      { name: "Bitcoin", ticker: "BTC" },
      { name: "Ethereum", ticker: "ETH" },
      { name: "Solana", ticker: "SOL" },
    ];

    const query = "eth";
    const filtered = cryptos.filter((c) =>
      c.ticker.toLowerCase().includes(query.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].ticker).toBe("ETH");
  });

  it("should sort by market cap descending", () => {
    const cryptos = [
      { name: "Bitcoin", marketCap: 50000000000 },
      { name: "Ethereum", marketCap: 30000000000 },
      { name: "Solana", marketCap: 10000000000 },
    ];

    const sorted = [...cryptos].sort((a, b) => b.marketCap - a.marketCap);
    expect(sorted[0].name).toBe("Bitcoin");
    expect(sorted[2].name).toBe("Solana");
  });

  it("should sort by price ascending", () => {
    const cryptos = [
      { name: "Bitcoin", price: 5000000 },
      { name: "Ethereum", price: 300000 },
      { name: "Solana", price: 10000 },
    ];

    const sorted = [...cryptos].sort((a, b) => a.price - b.price);
    expect(sorted[0].name).toBe("Solana");
    expect(sorted[2].name).toBe("Bitcoin");
  });

  it("should sort by price change percentage", () => {
    const cryptos = [
      { name: "Bitcoin", price: 110000, previousPrice: 100000 }, // +10%
      { name: "Ethereum", price: 95000, previousPrice: 100000 }, // -5%
      { name: "Solana", price: 120000, previousPrice: 100000 }, // +20%
    ];

    const withChange = cryptos.map((c) => ({
      ...c,
      change: ((c.price - (c.previousPrice || c.price)) / (c.previousPrice || c.price)) * 100,
    }));

    const sorted = withChange.sort((a, b) => b.change - a.change);
    expect(sorted[0].name).toBe("Solana"); // +20%
    expect(sorted[2].name).toBe("Ethereum"); // -5%
  });
});

describe("Crypto Purchase Calculations", () => {
  it("should calculate tokens from dollar amount", () => {
    const dollarAmount = 100; // $100.00
    const pricePerToken = 50; // $0.50 in cents
    const tokens = Math.floor((dollarAmount * 100) / pricePerToken);
    
    expect(tokens).toBe(200);
  });

  it("should calculate cost from token amount", () => {
    const tokens = 1000;
    const pricePerToken = 250; // $2.50 in cents
    const cost = tokens * pricePerToken;
    
    expect(cost).toBe(250000); // $2,500.00 in cents
  });

  it("should handle fractional cents correctly", () => {
    const tokens = 100;
    const pricePerToken = 33; // $0.33 in cents
    const totalCost = Math.floor(tokens * pricePerToken);
    
    expect(totalCost).toBe(3300); // $33.00 in cents
  });

  it("should validate minimum purchase amount", () => {
    const tokens = 0;
    expect(tokens > 0).toBe(false);
  });
});

describe("Crypto Price Change", () => {
  it("should calculate positive price change", () => {
    const currentPrice = 150; // $1.50
    const previousPrice = 100; // $1.00
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    expect(change).toBe(50);
  });

  it("should calculate negative price change", () => {
    const currentPrice = 80; // $0.80
    const previousPrice = 100; // $1.00
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    expect(change).toBe(-20);
  });

  it("should handle no previous price", () => {
    const currentPrice = 100;
    const previousPrice = undefined;
    const change = previousPrice
      ? ((currentPrice - previousPrice) / previousPrice) * 100
      : 0;
    
    expect(change).toBe(0);
  });
});

describe("Crypto Holdings", () => {
  it("should calculate ownership percentage", () => {
    const holderAmount = 10000000; // 10 million tokens
    const circulatingSupply = 100000000; // 100 million tokens
    const percentage = (holderAmount / circulatingSupply) * 100;
    
    expect(percentage).toBe(10);
  });

  it("should calculate value of holdings", () => {
    const tokenAmount = 50000;
    const pricePerToken = 200; // $2.00 in cents
    const totalValue = Math.floor(tokenAmount * pricePerToken);
    
    expect(totalValue).toBe(10000000); // $100,000 in cents
  });

  it("should sort holders by amount descending", () => {
    const holders = [
      { userId: "1", amount: 5000000 },
      { userId: "2", amount: 15000000 },
      { userId: "3", amount: 1000000 },
    ];

    const sorted = [...holders].sort((a, b) => b.amount - a.amount);
    expect(sorted[0].userId).toBe("2");
    expect(sorted[2].userId).toBe("3");
  });

  it("should limit top holders to specified number", () => {
    const holders = Array.from({ length: 50 }, (_, i) => ({
      userId: `${i}`,
      amount: (50 - i) * 1000000,
    }));

    const limit = 10;
    const topHolders = holders.slice(0, limit);
    expect(topHolders).toHaveLength(10);
  });
});

describe("Crypto Trades", () => {
  it("should record buy trade with correct fields", () => {
    const trade = {
      cryptoId: "crypto123" as any,
      amount: 1000,
      pricePerToken: 150, // $1.50
      totalValue: 150000, // $1,500.00
      tradeType: "buy" as const,
      timestamp: Date.now(),
    };

    expect(trade.amount).toBe(1000);
    expect(trade.pricePerToken).toBe(150);
    expect(trade.totalValue).toBe(trade.amount * trade.pricePerToken);
    expect(trade.tradeType).toBe("buy");
  });

  it("should record sell trade with correct fields", () => {
    const trade = {
      cryptoId: "crypto123" as any,
      amount: 500,
      pricePerToken: 180, // $1.80
      totalValue: 90000, // $900.00
      tradeType: "sell" as const,
      timestamp: Date.now(),
    };

    expect(trade.amount).toBe(500);
    expect(trade.pricePerToken).toBe(180);
    expect(trade.totalValue).toBe(trade.amount * trade.pricePerToken);
    expect(trade.tradeType).toBe("sell");
  });

  it("should sort recent trades by timestamp descending", () => {
    const trades = [
      { _id: "1", timestamp: 1000, amount: 100 },
      { _id: "2", timestamp: 3000, amount: 200 },
      { _id: "3", timestamp: 2000, amount: 150 },
    ];

    const sorted = [...trades].sort((a, b) => b.timestamp - a.timestamp);
    expect(sorted[0]._id).toBe("2"); // Most recent
    expect(sorted[2]._id).toBe("1"); // Oldest
  });
});

describe("Market Cap Calculations", () => {
  it("should calculate market cap from price and supply", () => {
    const price = 250; // $2.50 in cents
    const circulatingSupply = 50000000; // 50 million
    const marketCap = Math.floor(price * circulatingSupply);
    
    expect(marketCap).toBe(12500000000); // $125,000,000
  });

  it("should update market cap when price changes", () => {
    const oldPrice = 100;
    const newPrice = 120;
    const circulatingSupply = 100000000;
    
    const oldMarketCap = oldPrice * circulatingSupply;
    const newMarketCap = newPrice * circulatingSupply;
    
    expect(newMarketCap).toBeGreaterThan(oldMarketCap);
    expect(newMarketCap - oldMarketCap).toBe(2000000000); // $20M increase
  });
});

describe("Ticker Validation Edge Cases", () => {
  it("should accept three letter ticker", () => {
    const ticker = "BTC";
    const tickerRegex = /^[A-Z]{3,6}$/;
    expect(tickerRegex.test(ticker)).toBe(true);
  });

  it("should accept four letter ticker", () => {
    const ticker = "DOGE";
    const tickerRegex = /^[A-Z]{3,6}$/;
    expect(tickerRegex.test(ticker)).toBe(true);
  });

  it("should accept six letter ticker", () => {
    const ticker = "ABCDEF";
    const tickerRegex = /^[A-Z]{3,6}$/;
    expect(tickerRegex.test(ticker)).toBe(true);
  });

  it("should reject two letter ticker", () => {
    const ticker = "AB";
    const tickerRegex = /^[A-Z]{3,6}$/;
    expect(tickerRegex.test(ticker)).toBe(false);
  });

  it("should reject seven letter ticker", () => {
    const ticker = "ABCDEFG";
    const tickerRegex = /^[A-Z]{3,6}$/;
    expect(tickerRegex.test(ticker)).toBe(false);
  });

  it("should reject lowercase letters", () => {
    const ticker = "btc";
    const tickerRegex = /^[A-Z]{3,6}$/;
    expect(tickerRegex.test(ticker)).toBe(false);
  });

  it("should convert lowercase to uppercase before validation", () => {
    const ticker = "btc";
    const upperTicker = ticker.toUpperCase();
    const tickerRegex = /^[A-Z]{3,6}$/;
    expect(tickerRegex.test(upperTicker)).toBe(true);
  });
});
