import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Dangerous: wipes all user/game data. Guarded by a secret string.
export const resetAllData = mutation({
  args: {
    confirm: v.string(),
  },
  handler: async (ctx, args) => {
    const secret = process.env.RESET_SECRET || "RESET-ALL";
    if (args.confirm !== secret) {
      throw new Error("Invalid confirmation token. Aborting reset.");
    }

    // List of tables to clear. Keep in sync with convex/schema.ts
    const tables = [
      "tickHistory",
      "stockPriceHistory",
      "stockTrades",
      "cryptoPriceHistory",
      "cryptoTrades",
      "marketplaceSales",
      "marketplaceListings",
      "companySales",
      "companyShares",
      "transactions",
      "carts",
      "cartItems",
      "userStockHoldings",
      "userCryptoHoldings",
      "players",
      "users",
      "companies",
      "products",
      "stocks",
      "cryptocurrencies",
      "loans",
      "upgrades",
      "gamblingHistory",
      "playerInventory",
      "subscriptions",
      "webhookEvents",
      "gameConfig",
    ];

    for (const table of tables) {
      try {
        const rows = await (ctx.db.query as any)(table).collect();
        for (const row of rows) {
          try {
            await (ctx.db.delete as any)(row._id);
          } catch (err) {
            // ignore individual delete failures
            console.warn(`Failed to delete row ${row._id} from ${table}:`, err);
          }
        }
      } catch (err) {
        // table might not exist or other errors - ignore
        console.warn(`Skipping table ${table}:`, err);
      }
    }

    return { success: true };
  },
});

// Expose a simple query to check the reset secret requirement (not used by script)
export const getResetSecretRequired = query({
  handler: async () => {
    return !!process.env.RESET_SECRET;
  },
});
