import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Mutation: Buy stock
export const buyStock = mutation({
  args: {
    userId: v.id("players"),
    stockId: v.id("stocks"),
    shares: v.number(),
    accountType: v.union(v.literal("player"), v.literal("company")),
    accountId: v.union(v.id("players"), v.id("companies")),
  },
  handler: async (ctx, args) => {
    // EXPLOIT FIX: Convert shares to integer and validate
    const shares = Math.floor(args.shares);
    
    if (shares <= 0) {
      throw new Error("Number of shares must be positive");
    }

    if (!Number.isSafeInteger(shares)) {
      throw new Error("Number of shares is not a safe integer");
    }

    const stock = await ctx.db.get(args.stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    // EXPLOIT FIX: Prevent buying more shares than total outstanding
    const existingHoldings = await ctx.db
      .query("userStockHoldings")
      .withIndex("by_companyId", (q) => q.eq("companyId", stock.companyId))
      .collect();
    
    const totalSharesHeld = existingHoldings.reduce((sum, h) => sum + h.shares, 0);
    
    if (totalSharesHeld + shares > stock.totalShares) {
      throw new Error(`Cannot purchase ${shares} shares. Only ${stock.totalShares - totalSharesHeld} shares available.`);
    }

    const totalCost = stock.price * shares;

    // EXPLOIT FIX: Validate total cost is safe
    if (!Number.isSafeInteger(totalCost)) {
      throw new Error("Total cost calculation overflow");
    }

    // Check balance based on account type and deduct
    if (args.accountType === "player") {
      const playerId = args.accountId as Id<"players">;
      const player = await ctx.db.get(playerId);
      if (!player || player.balance < totalCost) {
        throw new Error("Insufficient balance");
      }
      // Deduct from player balance
      await ctx.db.patch(playerId, {
        balance: player.balance - totalCost,
        updatedAt: Date.now(),
      });
    } else {
      const companyId = args.accountId as Id<"companies">;
      const company = await ctx.db.get(companyId);
      if (!company || company.balance < totalCost) {
        throw new Error("Insufficient balance");
      }
      // Deduct from company balance
      await ctx.db.patch(companyId, {
        balance: company.balance - totalCost,
        updatedAt: Date.now(),
      });
    }

    // Add money to the stock's company (money flows to company when shares purchased)
    const stockCompany = await ctx.db.get(stock.companyId);
    if (stockCompany) {
      await ctx.db.patch(stock.companyId, {
        balance: stockCompany.balance + totalCost,
        updatedAt: Date.now(),
      });
    }

    // Check if user already has holdings for this stock
    const existingHolding = await ctx.db
      .query("userStockHoldings")
      .withIndex("by_userId_companyId", (q) =>
        q.eq("userId", args.userId).eq("companyId", stock.companyId)
      )
      .unique();

    if (existingHolding) {
      // Update existing holding with weighted average price
      const totalShares = existingHolding.shares + args.shares;
      const newAveragePrice = 
        (existingHolding.averagePurchasePrice * existingHolding.shares + totalCost) / totalShares;

      await ctx.db.patch(existingHolding._id, {
        shares: totalShares,
        averagePurchasePrice: newAveragePrice,
      });
    } else {
      // Create new holding
      await ctx.db.insert("userStockHoldings", {
        userId: args.userId,
        companyId: stock.companyId,
        stockId: args.stockId,
        shares: shares,
        averagePurchasePrice: stock.price,
        boughtAt: Date.now(),
      });
    }

    // Create transaction record
    await ctx.db.insert("transactions", {
      fromAccountId: args.accountId,
      fromAccountType: args.accountType,
      toAccountId: stock.companyId,
      toAccountType: "company" as const,
      amount: totalCost,
      assetType: "stock" as const,
      assetId: args.stockId,
      description: `Purchased ${shares} shares of ${stock.ticker}`,
      createdAt: Date.now(),
    });

    // Record trade for price history
    await ctx.db.insert("stockTrades", {
      stockId: args.stockId,
      companyId: stock.companyId,
      shares: shares,
      pricePerShare: stock.price,
      totalValue: totalCost,
      tradeType: "buy",
      timestamp: Date.now(),
    });

    // Apply upward price pressure when shares are bought
    // Buying increases price based on volume relative to total shares
    const buyPressure = shares / stock.totalShares;
    const priceImpact = Math.min(buyPressure * 0.05, 0.1); // Max 10% impact per trade
    const newPrice = Math.floor(stock.price * (1 + priceImpact));
    
    // EXPLOIT FIX: Validate new price is safe integer and reasonable
    if (Number.isFinite(newPrice) && newPrice > 0 && Number.isSafeInteger(newPrice) && newPrice !== stock.price) {
      const newMarketCap = newPrice * stock.totalShares;
      // EXPLOIT FIX: Also validate market cap is safe integer
      if (Number.isFinite(newMarketCap) && Number.isSafeInteger(newMarketCap) && newMarketCap >= 0) {
        await ctx.db.patch(args.stockId, {
          previousPrice: stock.price,
          price: newPrice,
          marketCap: newMarketCap,
          updatedAt: Date.now(),
        });
        
        await ctx.db.patch(stock.companyId, {
          marketCap: newMarketCap,
          updatedAt: Date.now(),
        });
      }
    }

    // Update stock record to trigger query refresh
    await ctx.db.patch(args.stockId, {
      updatedAt: Date.now(),
    });

    return existingHolding?._id;
  },
});

// Mutation: Sell stock
export const sellStock = mutation({
  args: {
    userId: v.id("players"),
    stockId: v.id("stocks"),
    shares: v.number(),
    accountType: v.union(v.literal("player"), v.literal("company")),
    accountId: v.union(v.id("players"), v.id("companies")),
  },
  handler: async (ctx, args) => {
    // EXPLOIT FIX: Convert shares to integer and validate
    const shares = Math.floor(args.shares);
    
    if (shares <= 0) {
      throw new Error("Number of shares must be positive");
    }

    if (!Number.isSafeInteger(shares)) {
      throw new Error("Number of shares is not a safe integer");
    }

    const stock = await ctx.db.get(args.stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    // Find user's holdings
    const holding = await ctx.db
      .query("userStockHoldings")
      .withIndex("by_userId_companyId", (q) =>
        q.eq("userId", args.userId).eq("companyId", stock.companyId)
      )
      .unique();

    if (!holding || holding.shares < shares) {
      throw new Error("Insufficient shares to sell");
    }

    const totalValue = stock.price * shares;

    // EXPLOIT FIX: Validate total value is safe
    if (!Number.isSafeInteger(totalValue)) {
      throw new Error("Total value calculation overflow");
    }

    // Check if the company has enough balance to buy back the shares
    const stockCompany = await ctx.db.get(stock.companyId);
    if (!stockCompany) {
      throw new Error("Company not found");
    }
    
    if (stockCompany.balance < totalValue) {
      throw new Error(
        `Company has insufficient balance to buy back shares. Company has $${(stockCompany.balance / 100).toFixed(2)} but needs $${(totalValue / 100).toFixed(2)}`
      );
    }

    // Deduct money from the company
    await ctx.db.patch(stock.companyId, {
      balance: stockCompany.balance - totalValue,
      updatedAt: Date.now(),
    });

    // Update or remove holding
    if (holding.shares === shares) {
      await ctx.db.delete(holding._id);
    } else {
      await ctx.db.patch(holding._id, {
        shares: holding.shares - shares,
      });
    }

    // Credit account based on type
    if (args.accountType === "player") {
      const playerId = args.accountId as Id<"players">;
      const player = await ctx.db.get(playerId);
      if (!player) throw new Error("Player not found");
      await ctx.db.patch(playerId, {
        balance: player.balance + totalValue,
        updatedAt: Date.now(),
      });
    } else {
      const companyId = args.accountId as Id<"companies">;
      const company = await ctx.db.get(companyId);
      if (!company) throw new Error("Company not found");
      await ctx.db.patch(companyId, {
        balance: company.balance + totalValue,
        updatedAt: Date.now(),
      });
    }

    // Create transaction record
    await ctx.db.insert("transactions", {
      fromAccountId: stock.companyId,
      fromAccountType: "company" as const,
      toAccountId: args.accountId,
      toAccountType: args.accountType,
      amount: totalValue,
      assetType: "stock" as const,
      assetId: args.stockId,
      description: `Sold ${shares} shares of ${stock.ticker}`,
      createdAt: Date.now(),
    });

    // Record trade for price history
    await ctx.db.insert("stockTrades", {
      stockId: args.stockId,
      companyId: stock.companyId,
      shares: shares,
      pricePerShare: stock.price,
      totalValue: totalValue,
      tradeType: "sell",
      timestamp: Date.now(),
    });

    // Apply downward price pressure when shares are sold
    // Selling reduces price based on volume relative to total shares
    const sellPressure = shares / stock.totalShares;
    const priceImpact = Math.min(sellPressure * 0.05, 0.1); // Max 10% impact per trade
    const newPrice = Math.floor(stock.price * (1 - priceImpact));
    const finalPrice = Math.max(100, newPrice); // Min $1.00
    
    // Validate final price before updating
    if (Number.isFinite(finalPrice) && finalPrice > 0 && finalPrice !== stock.price) {
      const newMarketCap = finalPrice * stock.totalShares;
      if (Number.isFinite(newMarketCap) && newMarketCap >= 0) {
        await ctx.db.patch(args.stockId, {
          previousPrice: stock.price,
          price: finalPrice,
          marketCap: newMarketCap,
          updatedAt: Date.now(),
        });
        
        await ctx.db.patch(stock.companyId, {
          marketCap: newMarketCap,
          updatedAt: Date.now(),
        });
      }
    }

    // Update stock record to trigger query refresh
    await ctx.db.patch(args.stockId, {
      updatedAt: Date.now(),
    });

    return totalValue;
  },
});

// Mutation: Update stock price
export const updateStockPrice = mutation({
  args: {
    stockId: v.id("stocks"),
    newPrice: v.number(), // in cents
  },
  handler: async (ctx, args) => {
    const stock = await ctx.db.get(args.stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    const newMarketCap = args.newPrice * stock.totalShares;

    await ctx.db.patch(args.stockId, {
      previousPrice: stock.price,
      price: args.newPrice,
      marketCap: newMarketCap,
      updatedAt: Date.now(),
    });

    // Update company market cap
    await ctx.db.patch(stock.companyId, {
      marketCap: newMarketCap,
      updatedAt: Date.now(),
    });

    return args.newPrice;
  },
});

// Query: Get stock info
export const getStock = query({
  args: {
    stockId: v.id("stocks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.stockId);
  },
});

// Query: Get stock by ticker
export const getStockByTicker = query({
  args: {
    ticker: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker))
      .unique();
  },
});

// Query: Get company's stock info
export const getCompanyStockInfo = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stocks")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .unique();
  },
});

// Query: Get all stocks
export const getAllStocks = query({
  handler: async (ctx) => {
    return await ctx.db.query("stocks").collect();
  },
});

// Query: Get player's stock holdings
export const getPlayerStockHoldings = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userStockHoldings")
      .withIndex("by_userId", (q) => q.eq("userId", args.playerId))
      .collect();
  },
});

// Query: Get stock holders for a company
export const getStockHolders = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userStockHoldings")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

// Query: Get top stock holders for a company
export const getTopStockHolders = query({
  args: {
    companyId: v.id("companies"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const holders = await ctx.db
      .query("userStockHoldings")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    return holders.sort((a, b) => b.shares - a.shares).slice(0, args.limit);
  },
});

// Query: Get stock price history for charting
export const getStockPriceHistory = query({
  args: {
    stockId: v.id("stocks"),
    timeframe: v.optional(v.union(
      v.literal("1H"),
      v.literal("1D"),
      v.literal("1W"),
      v.literal("1M"),
      v.literal("1Y"),
      v.literal("ALL")
    )),
  },
  handler: async (ctx, args) => {
    const timeframe = args.timeframe || "1W";
    const now = Date.now();
    let startTime = 0;

    // Calculate start time based on timeframe
    switch (timeframe) {
      case "1H":
        startTime = now - 60 * 60 * 1000; // 1 hour ago
        break;
      case "1D":
        startTime = now - 24 * 60 * 60 * 1000; // 1 day ago
        break;
      case "1W":
        startTime = now - 7 * 24 * 60 * 60 * 1000; // 1 week ago
        break;
      case "1M":
        startTime = now - 30 * 24 * 60 * 60 * 1000; // 1 month ago
        break;
      case "1Y":
        startTime = now - 365 * 24 * 60 * 60 * 1000; // 1 year ago
        break;
      case "ALL":
        startTime = 0; // All time
        break;
    }

    const history = await ctx.db
      .query("stockPriceHistory")
      .withIndex("by_stockId_timestamp", (q) => 
        q.eq("stockId", args.stockId).gte("timestamp", startTime)
      )
      .order("asc")
      .collect();

    return history;
  },
});

// Query: Get recent stock trades
export const getRecentStockTrades = query({
  args: {
    stockId: v.id("stocks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const trades = await ctx.db
      .query("stockTrades")
      .withIndex("by_stockId", (q) => q.eq("stockId", args.stockId))
      .order("desc")
      .take(limit);

    return trades;
  },
});

// Mutation: Record price history (called during tick or price updates)
export const recordStockPriceHistory = mutation({
  args: {
    stockId: v.id("stocks"),
    price: v.number(),
    open: v.optional(v.number()),
    high: v.optional(v.number()),
    low: v.optional(v.number()),
    close: v.optional(v.number()),
    volume: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("stockPriceHistory", {
      stockId: args.stockId,
      price: args.price,
      timestamp: Date.now(),
      open: args.open,
      high: args.high,
      low: args.low,
      close: args.close,
      volume: args.volume,
    });
  },
});

// Admin Mutation: Fix a stock that has gone into NaN or invalid state
export const fixBrokenStock = mutation({
  args: {
    stockId: v.id("stocks"),
  },
  handler: async (ctx, args) => {
    const stock = await ctx.db.get(args.stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    const company = await ctx.db.get(stock.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Calculate a fair recovery price based on company balance
    // Use fundamental pricing: market_cap = revenue * multiple
    const revenueAnnual = Math.max(100, company.revenueAnnual || company.balance * 4);
    const baseMultiple = Math.max(0.1, company.fundamentalMultiple || 6.67);
    const fundamentalMarketCap = Math.floor(revenueAnnual * baseMultiple);
    
    // Ensure totalShares is valid
    const totalShares = Math.max(1, stock.totalShares);
    
    // Calculate recovery price (minimum $1.00)
    const recoveryPrice = Math.max(100, Math.floor(fundamentalMarketCap / totalShares));
    
    // Ensure the recovery price is finite
    if (!Number.isFinite(recoveryPrice) || recoveryPrice <= 0) {
      throw new Error("Cannot calculate valid recovery price");
    }

    // Update stock with recovered price
    const newMarketCap = recoveryPrice * totalShares;
    
    await ctx.db.patch(args.stockId, {
      previousPrice: stock.price, // Keep the broken price as previousPrice
      price: recoveryPrice,
      marketCap: newMarketCap,
      updatedAt: Date.now(),
    });

    // Update company market cap
    await ctx.db.patch(stock.companyId, {
      marketCap: newMarketCap,
      updatedAt: Date.now(),
    });

    // Record the recovery in price history
    await ctx.db.insert("stockPriceHistory", {
      stockId: args.stockId,
      price: recoveryPrice,
      timestamp: Date.now(),
    });

    return {
      message: `Stock ${stock.ticker} recovered`,
      oldPrice: stock.price,
      newPrice: recoveryPrice,
      recoveryMethod: "fundamental_pricing",
    };
  },
});

// Query: Find broken stocks (with NaN or invalid prices)
export const getBrokenStocks = query({
  handler: async (ctx) => {
    const allStocks = await ctx.db.query("stocks").collect();
    return allStocks.filter(
      (stock: any) =>
        stock.price === null ||
        !Number.isFinite(stock.price) ||
        stock.price < 100
    );
  },
});

// Query: Find stock by ticker for admin
export const getStockIdByTicker = query({
  args: {
    ticker: v.string(),
  },
  handler: async (ctx, args) => {
    const stock = await ctx.db
      .query("stocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .unique();
    return stock;
  },
});
