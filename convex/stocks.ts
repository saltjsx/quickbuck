import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    const stock = await ctx.db.get(args.stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    const totalCost = stock.price * args.shares;

    // Check balance based on account type
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
        shares: args.shares,
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
      description: `Purchased ${args.shares} shares of ${stock.ticker}`,
      createdAt: Date.now(),
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

    if (!holding || holding.shares < args.shares) {
      throw new Error("Insufficient shares to sell");
    }

    const totalValue = stock.price * args.shares;

    // Update or remove holding
    if (holding.shares === args.shares) {
      await ctx.db.delete(holding._id);
    } else {
      await ctx.db.patch(holding._id, {
        shares: holding.shares - args.shares,
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
      description: `Sold ${args.shares} shares of ${stock.ticker}`,
      createdAt: Date.now(),
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
