import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

// Type definitions for player roles
export type PlayerRole = "normal" | "limited" | "banned" | "mod" | "admin";

// Helper: Get player role
export async function getPlayerRole(ctx: any, playerId: Id<"players">): Promise<PlayerRole> {
  const player = await ctx.db.get(playerId);
  return player?.role || "normal";
}

// Helper: Check if player has permission level
export async function hasPermission(
  ctx: any,
  playerId: Id<"players">,
  requiredRole: "mod" | "admin"
): Promise<boolean> {
  const role = await getPlayerRole(ctx, playerId);
  
  if (requiredRole === "admin") {
    return role === "admin";
  }
  
  if (requiredRole === "mod") {
    return role === "mod" || role === "admin";
  }
  
  return false;
}

// Helper: Check if player can perform actions
export async function canPerformActions(ctx: any, playerId: Id<"players">): Promise<boolean> {
  const role = await getPlayerRole(ctx, playerId);
  return role !== "banned" && role !== "limited";
}

// Helper: Check if player can create content
export async function canCreateContent(ctx: any, playerId: Id<"players">): Promise<boolean> {
  const role = await getPlayerRole(ctx, playerId);
  return role !== "banned" && role !== "limited";
}

// Query: Get current player with role info
export const getCurrentPlayer = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return null;

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    return player;
  },
});

// Query: Check if current user is mod or admin
export const checkModerationAccess = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { hasAccess: false, role: "normal" as PlayerRole };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return { hasAccess: false, role: "normal" as PlayerRole };
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const role = player?.role || "normal";
    const hasAccess = role === "mod" || role === "admin";

    return { hasAccess, role };
  },
});

// Query: Get all players for moderation panel
export const getAllPlayersForModeration = query({
  args: {
    filterRole: v.optional(v.union(
      v.literal("normal"),
      v.literal("limited"),
      v.literal("banned"),
      v.literal("mod"),
      v.literal("admin")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions");
    }

    let players: Doc<"players">[];
    
    if (args.filterRole) {
      players = await ctx.db
        .query("players")
        .withIndex("by_role", (q) => q.eq("role", args.filterRole))
        .collect();
    } else {
      players = await ctx.db.query("players").collect();
    }

    // Enrich with user data
    const enrichedPlayers = await Promise.all(
      players.map(async (player) => {
        const userData = await ctx.db.get(player.userId);
        return {
          ...player,
          userName: userData?.name || "Unknown",
          userEmail: userData?.email || "N/A",
        };
      })
    );

    return enrichedPlayers;
  },
});

// Mutation: Limit player account
export const limitPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    // Prevent limiting admins or self
    const targetRole = targetPlayer.role || "normal";
    if (targetRole === "admin") {
      throw new Error("Cannot limit an admin");
    }
    if (args.targetPlayerId === currentPlayer._id) {
      throw new Error("Cannot limit yourself");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "limited",
      limitReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Player account limited successfully" };
  },
});

// Mutation: Unlimit player account
export const unlimitPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "normal",
      limitReason: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Player account restored to normal" };
  },
});

// Mutation: Ban player and clear all their data
export const banPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    // Prevent banning admins or self
    const targetRole = targetPlayer.role || "normal";
    if (targetRole === "admin") {
      throw new Error("Cannot ban an admin");
    }
    if (args.targetPlayerId === currentPlayer._id) {
      throw new Error("Cannot ban yourself");
    }

    // Delete all user companies and their products
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.targetPlayerId))
      .collect();

    for (const company of companies) {
      // Delete all products for this company
      const products = await ctx.db
        .query("products")
        .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
        .collect();

      for (const product of products) {
        await ctx.db.delete(product._id);
      }

      // Delete stock if it exists
      const stock = await ctx.db
        .query("stocks")
        .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
        .unique();

      if (stock) {
        await ctx.db.delete(stock._id);
      }

      // Delete marketplace listings
      const listings = await ctx.db
        .query("marketplaceListings")
        .withIndex("by_sellerCompanyId", (q) => q.eq("sellerCompanyId", company._id))
        .collect();

      for (const listing of listings) {
        await ctx.db.delete(listing._id);
      }

      // Delete company sales
      const companySales = await ctx.db
        .query("companySales")
        .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
        .collect();

      for (const sale of companySales) {
        await ctx.db.delete(sale._id);
      }

      // Delete the company
      await ctx.db.delete(company._id);
    }

    // Delete all user stock holdings
    const stockHoldings = await ctx.db
      .query("userStockHoldings")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetPlayerId))
      .collect();

    for (const holding of stockHoldings) {
      await ctx.db.delete(holding._id);
    }

    // Delete all user crypto holdings
    const cryptoHoldings = await ctx.db
      .query("userCryptoHoldings")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetPlayerId))
      .collect();

    for (const holding of cryptoHoldings) {
      await ctx.db.delete(holding._id);
    }

    // Delete all cryptocurrencies created by user
    const cryptos = await ctx.db
      .query("cryptocurrencies")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", args.targetPlayerId))
      .collect();

    for (const crypto of cryptos) {
      // Delete all trades for this crypto
      const trades = await ctx.db
        .query("cryptoTrades")
        .withIndex("by_cryptoId", (q) => q.eq("cryptoId", crypto._id))
        .collect();

      for (const trade of trades) {
        await ctx.db.delete(trade._id);
      }

      // Delete price history
      const priceHistory = await ctx.db
        .query("cryptoPriceHistory")
        .withIndex("by_cryptoId", (q) => q.eq("cryptoId", crypto._id))
        .collect();

      for (const history of priceHistory) {
        await ctx.db.delete(history._id);
      }

      await ctx.db.delete(crypto._id);
    }

    // Delete user cart and cart items
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetPlayerId))
      .unique();

    if (cart) {
      const cartItems = await ctx.db
        .query("cartItems")
        .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
        .collect();

      for (const item of cartItems) {
        await ctx.db.delete(item._id);
      }

      await ctx.db.delete(cart._id);
    }

    // Delete all user transactions
    const transactionsFrom = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) => q.eq("fromAccountId", args.targetPlayerId))
      .collect();

    for (const tx of transactionsFrom) {
      await ctx.db.delete(tx._id);
    }

    const transactionsTo = await ctx.db
      .query("transactions")
      .withIndex("by_toAccountId", (q) => q.eq("toAccountId", args.targetPlayerId))
      .collect();

    for (const tx of transactionsTo) {
      await ctx.db.delete(tx._id);
    }

    // Delete all user loans
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const loan of loans) {
      await ctx.db.delete(loan._id);
    }

    // Delete all company shares owned by user
    const companyShares = await ctx.db
      .query("companyShares")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetPlayerId))
      .collect();

    for (const share of companyShares) {
      await ctx.db.delete(share._id);
    }

    // Delete marketplace sales where user was involved (as purchaser)
    const purchaserSales = await ctx.db
      .query("marketplaceSales")
      .withIndex("by_purchaserId", (q) => q.eq("purchaserId", args.targetPlayerId))
      .collect();

    for (const sale of purchaserSales) {
      await ctx.db.delete(sale._id);
    }

    // Delete player inventory
    const inventory = await ctx.db
      .query("playerInventory")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const item of inventory) {
      await ctx.db.delete(item._id);
    }

    // Delete upgrades
    const upgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const upgrade of upgrades) {
      await ctx.db.delete(upgrade._id);
    }

    // Delete gambling history
    const gamblingHistory = await ctx.db
      .query("gamblingHistory")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const entry of gamblingHistory) {
      await ctx.db.delete(entry._id);
    }

    // Delete stock price history and trades where relevant (keep these as they're historical)
    // Actually, we should keep these for admin records. Skip.

    // Now set the player as banned
    await ctx.db.patch(args.targetPlayerId, {
      role: "banned",
      banReason: args.reason,
      balance: 0,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Player banned successfully and all data cleared" };
  },
});

// Mutation: Unban player
export const unbanPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "normal",
      banReason: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Player unbanned successfully" };
  },
});

// Mutation: Warn player
export const warnPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    // Prevent warning admins or self
    const targetRole = targetPlayer.role || "normal";
    if (targetRole === "admin") {
      throw new Error("Cannot warn an admin");
    }
    if (args.targetPlayerId === currentPlayer._id) {
      throw new Error("Cannot warn yourself");
    }

    // Add warning to list
    const existingWarnings = targetPlayer.warnings || [];
    const newWarnings = [
      ...existingWarnings,
      {
        reason: args.reason,
        createdAt: Date.now(),
      },
    ];

    await ctx.db.patch(args.targetPlayerId, {
      warnings: newWarnings,
      warningCount: newWarnings.length,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Player warned successfully (${newWarnings.length} total warning${newWarnings.length !== 1 ? "s" : ""})`,
      warningCount: newWarnings.length,
    };
  },
});

// Mutation: Clear warnings for a player (mod and admin can do this)
export const clearWarnings = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    // Mods and admins can clear warnings
    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    await ctx.db.patch(args.targetPlayerId, {
      warnings: [],
      warningCount: 0,
      updatedAt: Date.now(),
    });

    return { success: true, message: "All warnings cleared for player" };
  },
});

// Mutation: Remove a specific warning (mod and admin can do this)
export const removeWarning = mutation({
  args: {
    targetPlayerId: v.id("players"),
    warningIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    // Mods and admins can remove warnings
    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    const warnings = targetPlayer.warnings || [];
    if (args.warningIndex < 0 || args.warningIndex >= warnings.length) {
      throw new Error("Invalid warning index");
    }

    // Remove the specific warning
    const newWarnings = warnings.filter((_, index) => index !== args.warningIndex);

    await ctx.db.patch(args.targetPlayerId, {
      warnings: newWarnings,
      warningCount: newWarnings.length,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Warning removed successfully",
      remainingWarnings: newWarnings.length,
    };
  },
});

// Mutation: Assign moderator role (admin only)
export const assignModerator = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Insufficient permissions - admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    const currentRole = targetPlayer.role || "normal";
    if (currentRole === "banned") {
      throw new Error("Cannot promote a banned player");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "mod",
      updatedAt: Date.now(),
    });

    return { success: true, message: "Player promoted to moderator" };
  },
});

// Mutation: Remove moderator role (admin only)
export const removeModerator = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Insufficient permissions - admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    const currentRole = targetPlayer.role || "normal";
    if (currentRole === "admin") {
      throw new Error("Cannot demote an admin");
    }
    if (currentRole !== "mod") {
      throw new Error("Target player is not a moderator");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "normal",
      updatedAt: Date.now(),
    });

    return { success: true, message: "Moderator demoted to normal user" };
  },
});

// Mutation: Delete company (mod action)
export const deleteCompanyAsMod = mutation({
  args: {
    companyId: v.id("companies"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Archive all products
    const products = await ctx.db
      .query("products")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const product of products) {
      await ctx.db.patch(product._id, {
        isActive: false,
        isArchived: true,
        updatedAt: Date.now(),
      });
    }

    // Delete stock if public
    if (company.isPublic) {
      const stock = await ctx.db
        .query("stocks")
        .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
        .unique();

      if (stock) {
        await ctx.db.delete(stock._id);
      }
    }

    // Delete the company
    await ctx.db.delete(args.companyId);

    return { success: true, message: `Company deleted by moderator. Reason: ${args.reason}` };
  },
});

// Mutation: Delete product (mod action)
export const deleteProductAsMod = mutation({
  args: {
    productId: v.id("products"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    await ctx.db.patch(args.productId, {
      isActive: false,
      isArchived: true,
      updatedAt: Date.now(),
    });

    return { success: true, message: `Product deleted by moderator. Reason: ${args.reason}` };
  },
});

// Mutation: Delete crypto (mod action)
export const deleteCryptoAsMod = mutation({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const crypto = await ctx.db.get(args.cryptoId);
    if (!crypto) throw new Error("Cryptocurrency not found");

    await ctx.db.delete(args.cryptoId);

    return { success: true, message: `Cryptocurrency deleted by moderator. Reason: ${args.reason}` };
  },
});

// Mutation: Set player balance (admin only)
export const setPlayerBalance = mutation({
  args: {
    targetPlayerId: v.id("players"),
    newBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Insufficient permissions - admin required");
    }

    if (args.newBalance < 0 || !Number.isSafeInteger(args.newBalance)) {
      throw new Error("Invalid balance value");
    }

    await ctx.db.patch(args.targetPlayerId, {
      balance: args.newBalance,
      updatedAt: Date.now(),
    });

    return { success: true, message: `Player balance set to $${(args.newBalance / 100).toFixed(2)}` };
  },
});

// Mutation: Set company balance (admin only)
export const setCompanyBalance = mutation({
  args: {
    companyId: v.id("companies"),
    newBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Insufficient permissions - admin required");
    }

    if (args.newBalance < 0 || !Number.isSafeInteger(args.newBalance)) {
      throw new Error("Invalid balance value");
    }

    await ctx.db.patch(args.companyId, {
      balance: args.newBalance,
      updatedAt: Date.now(),
    });

    return { success: true, message: `Company balance set to $${(args.newBalance / 100).toFixed(2)}` };
  },
});

// Mutation: Set stock price (admin only)
export const setStockPrice = mutation({
  args: {
    stockId: v.id("stocks"),
    newPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Insufficient permissions - admin required");
    }

    if (args.newPrice <= 0 || !Number.isSafeInteger(args.newPrice)) {
      throw new Error("Invalid price value");
    }

    const stock = await ctx.db.get(args.stockId);
    if (!stock) throw new Error("Stock not found");

    const newMarketCap = args.newPrice * stock.totalShares;

    await ctx.db.patch(args.stockId, {
      previousPrice: stock.price,
      price: args.newPrice,
      marketCap: newMarketCap,
      updatedAt: Date.now(),
    });

    return { success: true, message: `Stock price set to $${(args.newPrice / 100).toFixed(2)}` };
  },
});

// Query: Get all companies for moderation
export const getAllCompaniesForModeration = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions");
    }

    const companies = await ctx.db.query("companies").collect();

    // Enrich with owner data
    const enrichedCompanies = await Promise.all(
      companies.map(async (company) => {
        const owner = await ctx.db.get(company.ownerId);
        const ownerUser = owner ? await ctx.db.get(owner.userId) : null;
        return {
          ...company,
          ownerName: ownerUser?.name || "Unknown",
        };
      })
    );

    return enrichedCompanies;
  },
});

// Query: Get all cryptocurrencies for moderation
export const getAllCryptosForModeration = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions");
    }

    const cryptos = await ctx.db.query("cryptocurrencies").collect();

    // Enrich with creator data
    const enrichedCryptos = await Promise.all(
      cryptos.map(async (crypto) => {
        const creator = await ctx.db.get(crypto.creatorId);
        const creatorUser = creator ? await ctx.db.get(creator.userId) : null;
        return {
          ...crypto,
          creatorName: creatorUser?.name || "Unknown",
        };
      })
    );

    return enrichedCryptos;
  },
});

// Query: Get all products for moderation
export const getAllProductsForModeration = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions");
    }

    const products = await ctx.db.query("products").collect();

    // Enrich with company data
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        const company = await ctx.db.get(product.companyId);
        return {
          ...product,
          companyName: company?.name || "Unknown",
        };
      })
    );

    return enrichedProducts;
  },
});

// Internal mutation: Grant admin role (no auth check - for bootstrapping first admin)
export const grantAdminRole = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userEmail))
      .unique();

    if (!user) {
      throw new Error("User not found with email: " + args.userEmail);
    }

    // Find player
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) {
      throw new Error("Player not found for this user");
    }

    // Grant admin role
    await ctx.db.patch(player._id, {
      role: "admin",
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Admin role granted to ${user.name || user.email}`,
      playerId: player._id,
    };
  },
});
