import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Query: Get user's cryptocurrency holdings with details
export const getUserCryptoHoldings = query({
  args: {
    userId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const holdings = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.userId))
      .collect();

    // Fetch crypto details for each holding
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const crypto = await ctx.db.get(holding.cryptoId);
        const currentValue = crypto ? holding.balance * crypto.currentPrice : 0;
        const profitLoss = currentValue - holding.totalInvested;
        return {
          ...holding,
          crypto,
          currentValue,
          profitLoss,
          profitLossPercent: holding.totalInvested > 0 
            ? (profitLoss / holding.totalInvested) * 100 
            : 0,
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
