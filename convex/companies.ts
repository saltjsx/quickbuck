import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { validateName, validateDescription } from "./contentFilter";

// Mutation: Create company
export const createCompany = mutation({
  args: {
    ownerId: v.id("players"),
    name: v.string(),
    ticker: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // CONTENT FILTER: Validate company name and description
    const validatedName = validateName(args.name, "Company name");
    const validatedDescription = validateDescription(args.description, "Company description");

    const now = Date.now();
    
    const companyId = await ctx.db.insert("companies", {
      ownerId: args.ownerId,
      name: validatedName,
      ticker: args.ticker,
      description: validatedDescription,
      logo: args.logo,
      tags: args.tags,
      balance: 0,
      isPublic: false,
      reputationScore: 0.5, // Start with neutral reputation
      flaggedStatus: false,
      createdAt: now,
      updatedAt: now,
    });

    return companyId;
  },
});

// Mutation: Update company info
export const updateCompanyInfo = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    // CONTENT FILTER: Validate name and description if provided
    if (args.name !== undefined) {
      updates.name = validateName(args.name, "Company name");
    }
    if (args.description !== undefined) {
      updates.description = validateDescription(args.description, "Company description");
    }
    if (args.logo !== undefined) updates.logo = args.logo;
    if (args.tags !== undefined) updates.tags = args.tags;

    await ctx.db.patch(args.companyId, updates);

    return await ctx.db.get(args.companyId);
  },
});

// Mutation: Update company balance
export const updateCompanyBalance = mutation({
  args: {
    companyId: v.id("companies"),
    amount: v.number(), // in cents, can be negative
  },
  handler: async (ctx, args) => {
    // EXPLOIT FIX: Validate amount is safe integer
    if (!Number.isSafeInteger(args.amount)) {
      throw new Error("Amount is not a safe integer");
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const newBalance = company.balance + args.amount;

    // EXPLOIT FIX: Validate new balance is safe and non-negative
    if (!Number.isSafeInteger(newBalance)) {
      throw new Error("Balance calculation overflow");
    }

    if (newBalance < 0) {
      throw new Error("Insufficient company balance");
    }

    await ctx.db.patch(args.companyId, {
      balance: newBalance,
      updatedAt: Date.now(),
    });

    return newBalance;
  },
});

// Mutation: Make company public (IPO)
export const makeCompanyPublic = mutation({
  args: {
    companyId: v.id("companies"),
    ticker: v.string(),
    totalShares: v.number(), // Only players set the number of shares
  },
  handler: async (ctx, args) => {
    // EXPLOIT FIX: Validate total shares is positive and safe integer
    if (args.totalShares <= 0) {
      throw new Error("Total shares must be positive");
    }

    if (!Number.isSafeInteger(args.totalShares)) {
      throw new Error("Total shares is not a safe integer");
    }

    // EXPLOIT FIX: Set reasonable max shares limit (prevent overflow in calculations)
    const MAX_SHARES = 1000000000; // 1 billion shares max
    if (args.totalShares > MAX_SHARES) {
      throw new Error(`Total shares cannot exceed ${MAX_SHARES}`);
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    if (company.balance < 5000000) {
      throw new Error("Company balance must be at least $50,000 to go public");
    }

    if (company.isPublic) {
      throw new Error("Company is already public");
    }

    // Check if ticker is already taken
    const existingStock = await ctx.db
      .query("stocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker))
      .unique();

    if (existingStock) {
      throw new Error("Ticker symbol already in use");
    }

    // Market cap is always 5x the company balance
    const marketCap = company.balance * 5;

    // EXPLOIT FIX: Validate market cap is safe
    if (!Number.isSafeInteger(marketCap)) {
      throw new Error("Market cap calculation overflow");
    }

    // Share price is calculated from market cap and total shares
    const initialSharePrice = Math.floor(marketCap / args.totalShares);

    // EXPLOIT FIX: Validate share price is positive
    if (initialSharePrice <= 0) {
      throw new Error("Invalid share price calculation - too many shares for market cap");
    }
    const now = Date.now();

    // Update company
    await ctx.db.patch(args.companyId, {
      isPublic: true,
      ticker: args.ticker,
      marketCap,
      sharesOutstanding: args.totalShares,
      updatedAt: now,
    });

    // Create stock entry
    const stockId = await ctx.db.insert("stocks", {
      companyId: args.companyId,
      ticker: args.ticker,
      price: initialSharePrice,
      totalShares: args.totalShares,
      marketCap,
      createdAt: now,
      updatedAt: now,
    });

    return stockId;
  },
});

// Query: Get company
export const getCompany = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.companyId);
  },
});

// Query: Get player's companies
export const getPlayerCompanies = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.playerId))
      .collect();
  },
});

// Query: Get all public companies
export const getAllPublicCompanies = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect();
  },
});

// Query: Get all companies (public and private)
export const getAllCompanies = query({
  handler: async (ctx) => {
    return await ctx.db.query("companies").collect();
  },
});

// Query: Get company by ticker
export const getCompanyByTicker = query({
  args: {
    ticker: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker))
      .unique();
  },
});

// Query: Get player's ownership percentage in a company
export const getPlayerCompanyOwnership = query({
  args: {
    playerId: v.id("players"),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) return 0;

    // Check if player is the owner
    if (company.ownerId === args.playerId) {
      // If not public, owner has 100%
      if (!company.isPublic) return 100;
    }

    // Check shareholdings for public companies
    if (company.isPublic) {
      const holdings = await ctx.db
        .query("companyShares")
        .withIndex("by_userId_companyId", (q) =>
          q.eq("userId", args.playerId).eq("companyId", args.companyId)
        )
        .collect();

      const totalShares = holdings.reduce((sum, h) => sum + h.shares, 0);
      
      if (company.sharesOutstanding && company.sharesOutstanding > 0) {
        return (totalShares / company.sharesOutstanding) * 100;
      }
    }

    return 0;
  },
});

// Query: Get top companies by market cap
export const getTopCompaniesByMarketCap = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const publicCompanies = await ctx.db
      .query("companies")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect();

    return publicCompanies
      .filter((c) => c.marketCap !== undefined)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, args.limit);
  },
});

// Query: Get top companies by balance
export const getTopCompaniesByBalance = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const companies = await ctx.db.query("companies").collect();
    return companies.sort((a, b) => b.balance - a.balance).slice(0, args.limit);
  },
});

// Mutation: Delete company
export const deleteCompany = mutation({
  args: {
    companyId: v.id("companies"),
    ownerId: v.id("players"), // For validation
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Verify ownership
    if (company.ownerId !== args.ownerId) {
      throw new Error("Only the company owner can delete the company");
    }

    // Delete the stock if it exists (regardless of public status or shareholders)
    if (company.isPublic) {
      const stock = await ctx.db
        .query("stocks")
        .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
        .unique();
      
      if (stock) {
        await ctx.db.delete(stock._id);
      }
    }

    // Transfer company balance to owner
    const owner = await ctx.db.get(args.ownerId);
    if (!owner) {
      throw new Error("Owner not found");
    }

    const transferAmount = company.balance;
    if (transferAmount > 0) {
      await ctx.db.patch(args.ownerId, {
        balance: owner.balance + transferAmount,
        updatedAt: Date.now(),
      });

      // Create transaction record
      await ctx.db.insert("transactions", {
        fromAccountId: args.companyId,
        fromAccountType: "company" as const,
        toAccountId: args.ownerId,
        toAccountType: "player" as const,
        amount: transferAmount,
        assetType: "cash" as const,
        description: `Company ${company.name} deleted - balance transferred to owner`,
        createdAt: Date.now(),
      });
    }

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

    // Actually delete the company
    await ctx.db.delete(args.companyId);

    return {
      companyId: args.companyId,
      transferredAmount: transferAmount,
      message: `Company deleted successfully. $${(transferAmount / 100).toFixed(2)} transferred to owner.`,
    };
  },
});
