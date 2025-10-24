import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Initialize game configuration with defaults
export const initializeGameConfig = mutation({
  handler: async (ctx) => {
    const configs = [
      { key: "botBudget", value: 10000000 }, // $100,000 per tick
      { key: "tickIntervalMinutes", value: 20 },
      { key: "loanInterestRate", value: 5 }, // 5% daily
      { key: "maxLoanAmount", value: 500000000 }, // $5,000,000
      { key: "cryptoCreationCost", value: 1000000 }, // $10,000
      { key: "companyCreationCost", value: 0 }, // Free
      { key: "minCompanyBalanceForIPO", value: 5000000 }, // $50,000
      { key: "startingPlayerBalance", value: 1000000 }, // $10,000
    ];

    for (const config of configs) {
      const existing = await ctx.db
        .query("gameConfig")
        .withIndex("by_key", (q) => q.eq("key", config.key))
        .unique();

      if (!existing) {
        await ctx.db.insert("gameConfig", {
          ...config,
          updatedAt: Date.now(),
        });
      }
    }

    return { initialized: configs.length };
  },
});

// Get config value
export const getConfig = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    return config?.value;
  },
});

// Update config value (admin only in production)
export const updateConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("gameConfig", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get all config
export const getAllConfig = query({
  handler: async (ctx) => {
    return await ctx.db.query("gameConfig").collect();
  },
});
