import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Query: Get user's crypto holdings with details
export const getUserCryptoHoldings = query({
  args: {
    userId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const holdings = await ctx.db
      .query("userCryptoHoldings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Fetch crypto details for each holding
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const crypto = await ctx.db.get(holding.cryptoId);
        return {
          ...holding,
          crypto,
        };
      })
    );

    return enrichedHoldings;
  },
});

// Query: Get user's stock holdings with details
export const getUserStockHoldings = query({
  args: {
    userId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const holdings = await ctx.db
      .query("userStockHoldings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Fetch stock and company details for each holding
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const stock = await ctx.db.get(holding.stockId);
        const company = stock ? await ctx.db.get(stock.companyId) : null;
        return {
          ...holding,
          stock,
          company,
        };
      })
    );

    return enrichedHoldings;
  },
});
