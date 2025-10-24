import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Mutation: Create a new player
export const createPlayer = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const playerId = await ctx.db.insert("players", {
      userId: args.userId,
      balance: 1000000, // Start with $10,000 (in cents)
      netWorth: 1000000,
      createdAt: now,
      updatedAt: now,
    });

    return playerId;
  },
});

// Mutation: Update player balance
export const updatePlayerBalance = mutation({
  args: {
    playerId: v.id("players"),
    amount: v.number(), // in cents, can be negative
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    const newBalance = player.balance + args.amount;
    
    await ctx.db.patch(args.playerId, {
      balance: newBalance,
      updatedAt: Date.now(),
    });

    return newBalance;
  },
});

// Query: Get player
export const getPlayer = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.playerId);
  },
});

// Query: Get player by user ID
export const getPlayerByUserId = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Query: Get player balance
export const getPlayerBalance = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    return player?.balance ?? 0;
  },
});

// Helper function to calculate net worth
async function calculateNetWorth(ctx: any, playerId: Id<"players">) {
  const player = await ctx.db.get(playerId);
  if (!player) return 0;

  let netWorth = player.balance;

  // Add stock holdings value
  const stockHoldings = await ctx.db
    .query("userStockHoldings")
    .withIndex("by_userId", (q: any) => q.eq("userId", playerId))
    .collect();

  for (const holding of stockHoldings) {
    const stock = await ctx.db.get(holding.stockId);
    if (stock) {
      netWorth += holding.shares * stock.price;
    }
  }

  // Add crypto holdings value
  const cryptoHoldings = await ctx.db
    .query("userCryptoHoldings")
    .withIndex("by_userId", (q: any) => q.eq("userId", playerId))
    .collect();

  for (const holding of cryptoHoldings) {
    const crypto = await ctx.db.get(holding.cryptoId);
    if (crypto) {
      netWorth += holding.amount * crypto.price;
    }
  }

  // Add company ownership value
  const companies = await ctx.db
    .query("companies")
    .withIndex("by_ownerId", (q: any) => q.eq("ownerId", playerId))
    .collect();

  for (const company of companies) {
    netWorth += company.balance;
    if (company.isPublic && company.marketCap) {
      netWorth += company.marketCap;
    }
  }

  return netWorth;
}

// Query: Get player net worth (calculated from all assets)
export const getPlayerNetWorth = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await calculateNetWorth(ctx, args.playerId);
  },
});

// Query: Get all players sorted by field
export const getAllPlayers = query({
  args: {
    sortBy: v.union(v.literal("netWorth"), v.literal("balance")),
  },
  handler: async (ctx, args) => {
    const players = await ctx.db.query("players").collect();
    
    if (args.sortBy === "balance") {
      return players.sort((a, b) => b.balance - a.balance);
    }
    
    // For netWorth, we need to calculate it for each player
    const playersWithNetWorth = await Promise.all(
      players.map(async (player) => {
        const netWorth = await calculateNetWorth(ctx, player._id);
        return { ...player, netWorth };
      })
    );
    
    return playersWithNetWorth.sort((a, b) => b.netWorth - a.netWorth);
  },
});

// Query: Get top players
export const getTopPlayers = query({
  args: {
    limit: v.number(),
    sortBy: v.union(v.literal("netWorth"), v.literal("balance")),
  },
  handler: async (ctx, args) => {
    const players = await ctx.db.query("players").collect();
    
    if (args.sortBy === "balance") {
      const sorted = players.sort((a, b) => b.balance - a.balance);
      return sorted.slice(0, args.limit);
    }
    
    const playersWithNetWorth = await Promise.all(
      players.map(async (player) => {
        const netWorth = await calculateNetWorth(ctx, player._id);
        return { ...player, netWorth };
      })
    );
    
    return playersWithNetWorth.sort((a, b) => b.netWorth - a.netWorth).slice(0, args.limit);
  },
});
