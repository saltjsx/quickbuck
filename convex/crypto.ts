import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { canCreateContent } from "./moderation";
import { validateName, validateDescription, validateTicker } from "./contentFilter";

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
    // ROLE CHECK: Verify player can create crypto
    const canCreate = await canCreateContent(ctx, args.creatorId);
    if (!canCreate) {
      throw new Error("Your account does not have permission to create cryptocurrencies");
    }

    // CONTENT FILTER: Validate name, description, and ticker
    const validatedName = validateName(args.name, "Cryptocurrency name");
    const validatedDescription = validateDescription(args.description, "Cryptocurrency description");
    const validatedTicker = validateTicker(args.ticker);
    
    if (!validatedTicker) {
      throw new Error("Ticker symbol is required");
    }

    // Additional validation for crypto ticker (3-6 chars)
    if (validatedTicker.length < 3 || validatedTicker.length > 6) {
      throw new Error("Ticker must be 3-6 characters");
    }

    // Check if ticker is already taken
    const existing = await ctx.db
      .query("cryptocurrencies")
      .withIndex("by_ticker", (q) => q.eq("ticker", validatedTicker))
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
      name: validatedName,
      ticker: validatedTicker,
      description: validatedDescription,
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
    // EXPLOIT FIX: Validate amount is positive and safe integer
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    if (!Number.isSafeInteger(args.amount)) {
      throw new Error("Amount is not a safe integer");
    }

    const crypto = await ctx.db.get(args.cryptoId);
    if (!crypto) {
      throw new Error("Cryptocurrency not found");
    }

    // EXPLOIT FIX: Check that circulating supply + amount doesn't exceed total supply
    if (crypto.circulatingSupply + args.amount > crypto.totalSupply) {
      throw new Error(`Cannot purchase ${args.amount} coins. Only ${crypto.totalSupply - crypto.circulatingSupply} coins available.`);
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

    // EXPLOIT FIX: Validate total cost is safe
    if (!Number.isSafeInteger(totalCost)) {
      throw new Error("Total cost calculation overflow");
    }

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

    // Apply STRONG upward price pressure when crypto is bought
    // Cryptocurrencies should be highly volatile and react strongly to trades
    const circulatingSupply = Math.max(crypto.circulatingSupply + args.amount, 1);
    const buyPressure = args.amount / circulatingSupply;
    
    // Much stronger price impact: 20-50% impact possible on large trades
    // Minimum 0.5% increase even on tiny trades for volatility
    const baseImpact = Math.max(buyPressure * 0.5, 0.005); // Base: 50% of buy pressure, min 0.5%
    const volatilityMultiplier = 1.5 + Math.random(); // Random 1.5x-2.5x multiplier
    const priceImpact = Math.min(baseImpact * volatilityMultiplier, 0.5); // Max 50% impact per trade
    
    const newPrice = Math.max(1, Math.floor(crypto.price * (1 + priceImpact)));
    
    // Validate and update price
    if (Number.isFinite(newPrice) && newPrice > 0 && newPrice !== crypto.price) {
      const newMarketCap = Math.floor(newPrice * (crypto.circulatingSupply + args.amount));
      if (Number.isFinite(newMarketCap) && newMarketCap >= 0) {
        await ctx.db.patch(args.cryptoId, {
          previousPrice: crypto.price,
          price: newPrice,
          marketCap: newMarketCap,
          volume: crypto.volume + totalCost,
          updatedAt: Date.now(),
        });
        
        // Record price history for live charting
        await ctx.db.insert("cryptoPriceHistory", {
          cryptoId: args.cryptoId,
          price: newPrice,
          timestamp: Date.now(),
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
    // EXPLOIT FIX: Validate amount is positive and safe integer
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    if (!Number.isSafeInteger(args.amount)) {
      throw new Error("Amount is not a safe integer");
    }

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

    // EXPLOIT FIX: Validate total value is safe
    if (!Number.isSafeInteger(totalValue)) {
      throw new Error("Total value calculation overflow");
    }

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

    // Apply STRONG downward price pressure when crypto is sold
    // Selling should cause significant price drops for volatility
    const circulatingSupply = Math.max(crypto.circulatingSupply, 1);
    const sellPressure = args.amount / circulatingSupply;
    
    // Much stronger price impact: 20-50% drop possible on large sells
    // Minimum 0.5% decrease even on tiny sells for volatility
    const baseImpact = Math.max(sellPressure * 0.5, 0.005); // Base: 50% of sell pressure, min 0.5%
    const volatilityMultiplier = 1.5 + Math.random(); // Random 1.5x-2.5x multiplier
    const priceImpact = Math.min(baseImpact * volatilityMultiplier, 0.5); // Max 50% drop per trade
    
    const newPrice = Math.max(1, Math.floor(crypto.price * (1 - priceImpact)));
    
    // Validate and update price
    if (Number.isFinite(newPrice) && newPrice > 0 && newPrice !== crypto.price) {
      const newMarketCap = Math.floor(newPrice * Math.max(0, crypto.circulatingSupply - args.amount));
      if (Number.isFinite(newMarketCap) && newMarketCap >= 0) {
        await ctx.db.patch(args.cryptoId, {
          previousPrice: crypto.price,
          price: newPrice,
          marketCap: newMarketCap,
          volume: crypto.volume + totalValue,
          updatedAt: Date.now(),
        });
        
        // Record price history for live charting
        await ctx.db.insert("cryptoPriceHistory", {
          cryptoId: args.cryptoId,
          price: newPrice,
          timestamp: Date.now(),
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

// Query: Get 1-hour price history for multiple cryptocurrencies (for sparklines)
export const getCryptosPriceHistory1H = query({
  args: {
    cryptoIds: v.array(v.id("cryptocurrencies")),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startTime = now - 60 * 60 * 1000; // last 1 hour
    const maxPoints = Math.max(10, Math.min(args.points || 60, 120));

    const result: Record<string, { timestamp: number; price: number }[]> = {};

    for (const cryptoId of args.cryptoIds) {
      // Fetch last hour history for each cryptocurrency
      const history = await ctx.db
        .query("cryptoPriceHistory")
        .withIndex("by_cryptoId_timestamp", (q) =>
          q.eq("cryptoId", cryptoId).gte("timestamp", startTime)
        )
        .order("asc")
        .collect();

      // Downsample if needed to at most maxPoints (uniform sampling)
      let series = history.map((h) => ({ timestamp: h.timestamp, price: h.price }));
      if (series.length > maxPoints) {
        const step = Math.ceil(series.length / maxPoints);
        series = series.filter((_, idx) => idx % step === 0);
        // Ensure we include last point
        if (
          series[series.length - 1]?.timestamp !==
          history[history.length - 1]?.timestamp
        ) {
          const last = history[history.length - 1];
          series.push({ timestamp: last.timestamp, price: last.price });
        }
      }

      result[cryptoId] = series;
    }

    return result;
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
