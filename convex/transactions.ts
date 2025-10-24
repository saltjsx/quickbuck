import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
