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

