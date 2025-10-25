import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Mutation: Create cryptocurrency
export const createCryptocurrency = mutation({
  args: {
    creatorId: v.id("players"),
    name: v.string(),
    ticker: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if ticker is already taken
    const existing = await ctx.db
      .query("cryptocurrencies")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .unique();

    if (existing) {
      throw new Error("Ticker already exists");
    }

    // Check creator balance (costs $10,000 to create)
    const creator = await ctx.db.get(args.creatorId);
    if (!creator || creator.balance < 1000000) { // 1000000 cents = $10,000
      throw new Error("Insufficient balance to create cryptocurrency");
    }

    // Deduct creation cost
    await ctx.db.patch(args.creatorId, {
      balance: creator.balance - 1000000,
      updatedAt: Date.now(),
    });

    const now = Date.now();
    const totalSupply = 1000000; // 1,000,000 coins max
    const initialMarketCap = 1000000; // $10,000 in cents
    const initialPrice = Math.floor(initialMarketCap / totalSupply); // Price per coin

    const cryptoId = await ctx.db.insert("cryptocurrencies", {
      creatorId: args.creatorId,
      name: args.name,
      ticker: args.ticker.toUpperCase(),
      description: args.description,
      image: args.image,
      price: initialPrice,
      marketCap: initialMarketCap,
      volume: 0,
      totalSupply: totalSupply,
      circulatingSupply: 0, // No coins in circulation initially
      createdAt: now,
      updatedAt: now,
    });

    // Creator does NOT get initial supply - they must purchase coins themselves
    // The coins are available for purchase by any player

    return cryptoId;
  },
});

// Mutation: Buy cryptocurrency
export const buyCryptocurrency = mutation({
  args: {
    userId: v.id("players"),
    cryptoId: v.id("cryptocurrencies"),
    amount: v.number(),
    accountType: v.union(v.literal("player"), v.literal("company")),
    accountId: v.union(v.id("players"), v.id("companies")),
  },
  handler: async (ctx, args) => {
    const crypto = await ctx.db.get(args.cryptoId);
    if (!crypto) {
      throw new Error("Cryptocurrency not found");
    }

    // Check that purchase doesn't exceed total supply
    if (args.amount > crypto.totalSupply) {
      throw new Error(`Cannot purchase more than ${crypto.totalSupply} coins`);
    }

    // Check that total purchase won't exceed total supply
    if (crypto.circulatingSupply + args.amount > crypto.totalSupply) {
      throw new Error(
        `Cannot purchase that many coins. Only ${
          crypto.totalSupply - crypto.circulatingSupply
        } coins remaining`
      );
    }

    const totalCost = Math.floor(crypto.price * args.amount);

    // Check balance and deduct
    if (args.accountType === "player") {
      const playerId = args.accountId as Id<"players">;
      const player = await ctx.db.get(playerId);
      if (!player || player.balance < totalCost) {
        throw new Error("Insufficient balance");
      }
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
      await ctx.db.patch(companyId, {
        balance: company.balance - totalCost,
        updatedAt: Date.now(),
      });
    }

    // Update or create holding
    const existingHolding = await ctx.db
      .query("userCryptoHoldings")
      .withIndex("by_userId_cryptoId", (q) =>
        q.eq("userId", args.userId).eq("cryptoId", args.cryptoId)
      )
      .unique();

    if (existingHolding) {
      const totalAmount = existingHolding.amount + args.amount;
      const newAveragePrice =
        (existingHolding.averagePurchasePrice * existingHolding.amount + totalCost) /
        totalAmount;

      await ctx.db.patch(existingHolding._id, {
        amount: totalAmount,
        averagePurchasePrice: newAveragePrice,
      });
    } else {
      await ctx.db.insert("userCryptoHoldings", {
        userId: args.userId,
        cryptoId: args.cryptoId,
        amount: args.amount,
        averagePurchasePrice: crypto.price,
        boughtAt: Date.now(),
      });
    }

    // Update circulating supply
    await ctx.db.patch(args.cryptoId, {
      circulatingSupply: crypto.circulatingSupply + args.amount,
      updatedAt: Date.now(),
    });

    // Create transaction
    await ctx.db.insert("transactions", {
      fromAccountId: args.accountId,
      fromAccountType: args.accountType,
      toAccountId: crypto.creatorId,
      toAccountType: "player" as const,
      amount: totalCost,
      assetType: "crypto" as const,
      assetId: args.cryptoId,
      description: `Purchased ${args.amount} ${crypto.ticker}`,
      createdAt: Date.now(),
    });

    // Record trade
    await ctx.db.insert("cryptoTrades", {
      cryptoId: args.cryptoId,
      amount: args.amount,
      pricePerToken: crypto.price,
      totalValue: totalCost,
      tradeType: "buy",
      timestamp: Date.now(),
    });

    // Apply upward price pressure when crypto is bought
    // Buying increases price based on volume relative to circulating supply
    const circulatingSupply = Math.max(crypto.circulatingSupply + args.amount, 1);
    const buyPressure = args.amount / circulatingSupply;
    const priceImpact = Math.min(buyPressure * 0.08, 0.15); // Max 15% impact per trade
    const newPrice = Math.floor(crypto.price * (1 + priceImpact));
    
    // Validate new price before updating
    if (Number.isFinite(newPrice) && newPrice > 0 && newPrice !== crypto.price) {
      const newMarketCap = Math.floor(newPrice * crypto.circulatingSupply);
      if (Number.isFinite(newMarketCap) && newMarketCap >= 0) {
        await ctx.db.patch(args.cryptoId, {
          previousPrice: crypto.price,
          price: newPrice,
          marketCap: newMarketCap,
          updatedAt: Date.now(),
        });
      }
    }

    return existingHolding?._id;
  },
});

// Mutation: Sell cryptocurrency
export const sellCryptocurrency = mutation({
  args: {
    userId: v.id("players"),
    cryptoId: v.id("cryptocurrencies"),
    amount: v.number(),
    accountType: v.union(v.literal("player"), v.literal("company")),
    accountId: v.union(v.id("players"), v.id("companies")),
  },
  handler: async (ctx, args) => {
    const crypto = await ctx.db.get(args.cryptoId);
    if (!crypto) {
      throw new Error("Cryptocurrency not found");
    }

    const holding = await ctx.db
      .query("userCryptoHoldings")
      .withIndex("by_userId_cryptoId", (q) =>
        q.eq("userId", args.userId).eq("cryptoId", args.cryptoId)
      )
      .unique();

    if (!holding || holding.amount < args.amount) {
      throw new Error("Insufficient crypto holdings");
    }

    const totalValue = Math.floor(crypto.price * args.amount);

    // Update or remove holding
    if (holding.amount === args.amount) {
      await ctx.db.delete(holding._id);
    } else {
      await ctx.db.patch(holding._id, {
        amount: holding.amount - args.amount,
      });
    }

    // Update circulating supply
    await ctx.db.patch(args.cryptoId, {
      circulatingSupply: Math.max(0, crypto.circulatingSupply - args.amount),
      updatedAt: Date.now(),
    });

    // Credit account
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

    // Create transaction
    await ctx.db.insert("transactions", {
      fromAccountId: crypto.creatorId,
      fromAccountType: "player" as const,
      toAccountId: args.accountId,
      toAccountType: args.accountType,
      amount: totalValue,
      assetType: "crypto" as const,
      assetId: args.cryptoId,
      description: `Sold ${args.amount} ${crypto.ticker}`,
      createdAt: Date.now(),
    });

    // Record trade
    await ctx.db.insert("cryptoTrades", {
      cryptoId: args.cryptoId,
      amount: args.amount,
      pricePerToken: crypto.price,
      totalValue: totalValue,
      tradeType: "sell",
      timestamp: Date.now(),
    });

    // Apply downward price pressure when crypto is sold
    // Selling reduces price based on volume relative to circulating supply
    const circulatingSupply = Math.max(crypto.circulatingSupply, 1);
    const sellPressure = args.amount / circulatingSupply;
    const priceImpact = Math.min(sellPressure * 0.08, 0.15); // Max 15% impact per trade (higher than stocks)
    const newPrice = Math.floor(crypto.price * (1 - priceImpact));
    const finalPrice = Math.max(1, newPrice); // Min $0.01
    
    // Validate final price before updating
    if (Number.isFinite(finalPrice) && finalPrice > 0 && finalPrice !== crypto.price) {
      const newMarketCap = Math.floor(finalPrice * crypto.circulatingSupply);
      if (Number.isFinite(newMarketCap) && newMarketCap >= 0) {
        await ctx.db.patch(args.cryptoId, {
          previousPrice: crypto.price,
          price: finalPrice,
          marketCap: newMarketCap,
          updatedAt: Date.now(),
        });
      }
    }

    return totalValue;
  },
});

// Mutation: Update crypto price
export const updateCryptoPrice = mutation({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    newPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const crypto = await ctx.db.get(args.cryptoId);
    if (!crypto) {
      throw new Error("Cryptocurrency not found");
    }

    const newMarketCap = Math.floor(args.newPrice * crypto.circulatingSupply);

    await ctx.db.patch(args.cryptoId, {
      previousPrice: crypto.price,
      price: args.newPrice,
      marketCap: newMarketCap,
      updatedAt: Date.now(),
    });

    return args.newPrice;
  },
});

// Query: Get cryptocurrency
export const getCryptocurrency = query({
  args: {
    cryptoId: v.id("cryptocurrencies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.cryptoId);
  },
});

// Query: Get cryptocurrency by ticker
export const getCryptocurrencyByTicker = query({
  args: {
    ticker: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cryptocurrencies")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .unique();
  },
});

// Query: Get all cryptocurrencies
export const getAllCryptocurrencies = query({
  handler: async (ctx) => {
    return await ctx.db.query("cryptocurrencies").collect();
  },
});

// Query: Get player's crypto holdings
export const getPlayerCryptoHoldings = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userCryptoHoldings")
      .withIndex("by_userId", (q) => q.eq("userId", args.playerId))
      .collect();
  },
});

// Query: Get crypto holders
export const getCryptoHolders = query({
  args: {
    cryptoId: v.id("cryptocurrencies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userCryptoHoldings")
      .withIndex("by_cryptoId", (q) => q.eq("cryptoId", args.cryptoId))
      .collect();
  },
});

// Query: Get top crypto holders
export const getTopCryptoHolders = query({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const holders = await ctx.db
      .query("userCryptoHoldings")
      .withIndex("by_cryptoId", (q) => q.eq("cryptoId", args.cryptoId))
      .collect();

    return holders.sort((a, b) => b.amount - a.amount).slice(0, args.limit);
  },
});

// Query: Get top cryptocurrencies by market cap
export const getTopCryptosByMarketCap = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const cryptos = await ctx.db.query("cryptocurrencies").collect();
    return cryptos.sort((a, b) => b.marketCap - a.marketCap).slice(0, args.limit);
  },
});

// Query: Get crypto price history for charting
export const getCryptoPriceHistory = query({
  args: {
    cryptoId: v.id("cryptocurrencies"),
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
        startTime = now - 60 * 60 * 1000;
        break;
      case "1D":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "1W":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "1M":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "1Y":
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      case "ALL":
        startTime = 0;
        break;
    }

    const history = await ctx.db
      .query("cryptoPriceHistory")
      .withIndex("by_cryptoId_timestamp", (q) => 
        q.eq("cryptoId", args.cryptoId).gte("timestamp", startTime)
      )
      .order("asc")
      .collect();

    return history;
  },
});

// Query: Get recent crypto trades
export const getRecentCryptoTrades = query({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const trades = await ctx.db
      .query("cryptoTrades")
      .withIndex("by_cryptoId", (q) => q.eq("cryptoId", args.cryptoId))
      .order("desc")
      .take(limit);

    return trades;
  },
});

// Mutation: Record price history (called during tick or price updates)
export const recordCryptoPriceHistory = mutation({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    price: v.number(),
    open: v.optional(v.number()),
    high: v.optional(v.number()),
    low: v.optional(v.number()),
    close: v.optional(v.number()),
    volume: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("cryptoPriceHistory", {
      cryptoId: args.cryptoId,
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
