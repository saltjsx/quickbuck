import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Mutation: Create transaction
export const createTransaction = mutation({
  args: {
    fromAccountId: v.union(v.id("players"), v.id("companies")),
    fromAccountType: v.union(v.literal("player"), v.literal("company")),
    toAccountId: v.union(v.id("players"), v.id("companies")),
    toAccountType: v.union(v.literal("player"), v.literal("company")),
    amount: v.number(),
    assetType: v.union(
      v.literal("cash"),
      v.literal("stock"),
      v.literal("crypto"),
      v.literal("product")
    ),
    assetId: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const transactionId = await ctx.db.insert("transactions", {
      ...args,
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

// Query: Get transaction
export const getTransaction = query({
  args: {
    transactionId: v.id("transactions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.transactionId);
  },
});

// Query: Get player transaction history
export const getPlayerTransactionHistory = query({
  args: {
    playerId: v.id("players"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sent = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) => q.eq("fromAccountId", args.playerId))
      .collect();

    const received = await ctx.db
      .query("transactions")
      .withIndex("by_toAccountId", (q) => q.eq("toAccountId", args.playerId))
      .collect();

    const all = [...sent, ...received].sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      return all.slice(0, args.limit);
    }

    return all;
  },
});

// Query: Get company transaction history
export const getCompanyTransactionHistory = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sent = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) => q.eq("fromAccountId", args.companyId))
      .collect();

    const received = await ctx.db
      .query("transactions")
      .withIndex("by_toAccountId", (q) => q.eq("toAccountId", args.companyId))
      .collect();

    const all = [...sent, ...received].sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      return all.slice(0, args.limit);
    }

    return all;
  },
});

// Query: Get recent transactions (global)
export const getRecentTransactions = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_createdAt")
      .order("desc")
      .take(args.limit);

    return transactions;
  },
});

// Mutation: Transfer cash between accounts
export const transferCash = mutation({
  args: {
    fromAccountId: v.union(v.id("players"), v.id("companies")),
    fromAccountType: v.union(v.literal("player"), v.literal("company")),
    toAccountId: v.union(v.id("players"), v.id("companies")),
    toAccountType: v.union(v.literal("player"), v.literal("company")),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // Deduct from sender
    if (args.fromAccountType === "player") {
      const playerId = args.fromAccountId as Id<"players">;
      const player = await ctx.db.get(playerId);
      if (!player || player.balance < args.amount) {
        throw new Error("Insufficient balance");
      }
      await ctx.db.patch(playerId, {
        balance: player.balance - args.amount,
        updatedAt: Date.now(),
      });
    } else {
      const companyId = args.fromAccountId as Id<"companies">;
      const company = await ctx.db.get(companyId);
      if (!company || company.balance < args.amount) {
        throw new Error("Insufficient balance");
      }
      await ctx.db.patch(companyId, {
        balance: company.balance - args.amount,
        updatedAt: Date.now(),
      });
    }

    // Credit to receiver
    if (args.toAccountType === "player") {
      const playerId = args.toAccountId as Id<"players">;
      const player = await ctx.db.get(playerId);
      if (!player) throw new Error("Recipient not found");
      await ctx.db.patch(playerId, {
        balance: player.balance + args.amount,
        updatedAt: Date.now(),
      });
    } else {
      const companyId = args.toAccountId as Id<"companies">;
      const company = await ctx.db.get(companyId);
      if (!company) throw new Error("Recipient not found");
      await ctx.db.patch(companyId, {
        balance: company.balance + args.amount,
        updatedAt: Date.now(),
      });
    }

    // Create transaction record
    const transactionId = await ctx.db.insert("transactions", {
      fromAccountId: args.fromAccountId,
      fromAccountType: args.fromAccountType,
      toAccountId: args.toAccountId,
      toAccountType: args.toAccountType,
      amount: args.amount,
      assetType: "cash" as const,
      description: args.description || "Cash transfer",
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

// Mutation: Transfer crypto between accounts
export const transferCrypto = mutation({
  args: {
    fromPlayerId: v.id("players"),
    toAccountId: v.union(v.id("players"), v.id("companies")),
    toAccountType: v.union(v.literal("player"), v.literal("company")),
    cryptoId: v.id("cryptocurrencies"),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // Get sender's crypto holding
    const holding = await ctx.db
      .query("userCryptoHoldings")
      .withIndex("by_userId_cryptoId", (q) =>
        q.eq("userId", args.fromPlayerId).eq("cryptoId", args.cryptoId)
      )
      .unique();

    if (!holding || holding.amount < args.amount) {
      throw new Error("Insufficient crypto holdings");
    }

    // Deduct from sender
    if (holding.amount === args.amount) {
      // Delete the holding if amount matches
      await ctx.db.delete(holding._id);
    } else {
      await ctx.db.patch(holding._id, {
        amount: holding.amount - args.amount,
      });
    }

    // Add to receiver (only players can receive crypto holdings)
    if (args.toAccountType === "player") {
      const recipientHolding = await ctx.db
        .query("userCryptoHoldings")
        .withIndex("by_userId_cryptoId", (q) =>
          q.eq("userId", args.toAccountId as Id<"players">).eq("cryptoId", args.cryptoId)
        )
        .unique();

      if (recipientHolding) {
        // Add to existing holding
        await ctx.db.patch(recipientHolding._id, {
          amount: recipientHolding.amount + args.amount,
        });
      } else {
        // Create new holding
        const crypto = await ctx.db.get(args.cryptoId);
        if (!crypto) throw new Error("Crypto not found");
        await ctx.db.insert("userCryptoHoldings", {
          userId: args.toAccountId as Id<"players">,
          cryptoId: args.cryptoId,
          amount: args.amount,
          averagePurchasePrice: holding.averagePurchasePrice,
          boughtAt: Date.now(),
        });
      }
    } else {
      throw new Error("Companies cannot receive crypto holdings");
    }

    // Create transaction record
    const transactionId = await ctx.db.insert("transactions", {
      fromAccountId: args.fromPlayerId,
      fromAccountType: "player" as const,
      toAccountId: args.toAccountId,
      toAccountType: args.toAccountType,
      amount: args.amount,
      assetType: "crypto" as const,
      assetId: args.cryptoId,
      description: args.description || "Crypto transfer",
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

// Mutation: Transfer stock between accounts
export const transferStock = mutation({
  args: {
    fromPlayerId: v.id("players"),
    toAccountId: v.union(v.id("players"), v.id("companies")),
    toAccountType: v.union(v.literal("player"), v.literal("company")),
    stockId: v.id("stocks"),
    shares: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.shares <= 0) {
      throw new Error("Shares must be positive");
    }

    // Get sender's stock holding
    const holding = await ctx.db
      .query("userStockHoldings")
      .withIndex("by_userId_companyId", (q) => {
        const stock = ctx.db.get(args.stockId);
        return q.eq("userId", args.fromPlayerId);
      })
      .filter((h: any) => h.stockId === args.stockId)
      .unique();

    if (!holding || holding.shares < args.shares) {
      throw new Error("Insufficient stock holdings");
    }

    // Deduct from sender
    if (holding.shares === args.shares) {
      // Delete the holding if shares match
      await ctx.db.delete(holding._id);
    } else {
      await ctx.db.patch(holding._id, {
        shares: holding.shares - args.shares,
      });
    }

    // Add to receiver (only players can receive stock holdings)
    if (args.toAccountType === "player") {
      const stock = await ctx.db.get(args.stockId);
      if (!stock) throw new Error("Stock not found");

      const recipientHolding = await ctx.db
        .query("userStockHoldings")
        .withIndex("by_userId_companyId", (q) =>
          q.eq("userId", args.toAccountId as Id<"players">).eq("companyId", stock.companyId)
        )
        .filter((h: any) => h.stockId === args.stockId)
        .unique();

      if (recipientHolding) {
        // Add to existing holding
        await ctx.db.patch(recipientHolding._id, {
          shares: recipientHolding.shares + args.shares,
        });
      } else {
        // Create new holding
        await ctx.db.insert("userStockHoldings", {
          userId: args.toAccountId as Id<"players">,
          companyId: stock.companyId,
          stockId: args.stockId,
          shares: args.shares,
          averagePurchasePrice: holding.averagePurchasePrice,
          boughtAt: Date.now(),
        });
      }
    } else {
      throw new Error("Companies cannot receive stock holdings");
    }

    // Create transaction record
    const transactionId = await ctx.db.insert("transactions", {
      fromAccountId: args.fromPlayerId,
      fromAccountType: "player" as const,
      toAccountId: args.toAccountId,
      toAccountType: args.toAccountType,
      amount: args.shares,
      assetType: "stock" as const,
      assetId: args.stockId,
      description: args.description || "Stock transfer",
      createdAt: Date.now(),
    });

    return transactionId;
  },
});
