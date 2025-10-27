import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Leaderboard query functions for top players and companies
 */

// Top 5 players by balance
export const getTopPlayersByBalance = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { limit = 5 } = args;
    const players = await ctx.db.query("players").collect();
    
    // Sort by balance descending and take top N
    const sorted = players
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);

    // Enrich with user info
    const enriched = await Promise.all(
      sorted.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          ...player,
          userName: user?.name || "Anonymous",
          userEmail: user?.email,
          userImage: user?.image,
        };
      })
    );

    return enriched;
  },
});

// Top 5 players by net worth
export const getTopPlayersByNetWorth = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { limit = 5 } = args;
    const players = await ctx.db.query("players").collect();
    
    // Sort by net worth descending and take top N
    const sorted = players
      .sort((a, b) => b.netWorth - a.netWorth)
      .slice(0, limit);

    // Enrich with user info
    const enriched = await Promise.all(
      sorted.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          ...player,
          userName: user?.name || "Anonymous",
          userEmail: user?.email,
          userImage: user?.image,
        };
      })
    );

    return enriched;
  },
});

// Top 5 companies by market cap (public companies only)
export const getTopCompaniesByMarketCap = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { limit = 5 } = args;
    const companies = await ctx.db.query("companies").collect();
    
    // Filter public companies, sort by market cap descending and take top N
    const sorted = companies
      .filter((c) => c.isPublic)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, limit);

    // Enrich with owner info
    const enriched = await Promise.all(
      sorted.map(async (company) => {
        const owner = await ctx.db.get(company.ownerId);
        const ownerUser = owner ? await ctx.db.get(owner.userId) : null;
        return {
          ...company,
          ownerName: ownerUser?.name || "Anonymous",
          ownerImage: ownerUser?.image,
        };
      })
    );

    return enriched;
  },
});

// Top 5 companies by cash balance
export const getTopCompaniesByBalance = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { limit = 5 } = args;
    const companies = await ctx.db.query("companies").collect();
    
    // Sort by balance descending and take top N
    const sorted = companies
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);

    // Enrich with owner info
    const enriched = await Promise.all(
      sorted.map(async (company) => {
        const owner = await ctx.db.get(company.ownerId);
        const ownerUser = owner ? await ctx.db.get(owner.userId) : null;
        return {
          ...company,
          ownerName: ownerUser?.name || "Anonymous",
          ownerImage: ownerUser?.image,
        };
      })
    );

    return enriched;
  },
});

// All players sorted by net worth (with pagination)
export const getAllPlayersSorted = query({
  args: {
    sortBy: v.optional(v.union(v.literal("netWorth"), v.literal("balance"))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { sortBy = "netWorth", limit = 50, offset = 0 } = args;
    const players = await ctx.db.query("players").collect();

    // Sort players
    const sorted = players.sort((a, b) => {
      const field = sortBy as keyof typeof a;
      return (b[field] as number) - (a[field] as number);
    });

    // Apply pagination
    const paginated = sorted.slice(offset, offset + limit);

    // Enrich with user info and calculate rank
    const enriched = await Promise.all(
      paginated.map(async (player, index) => {
        const user = await ctx.db.get(player.userId);
        return {
          ...player,
          userName: user?.name || "Anonymous",
          userEmail: user?.email,
          userImage: user?.image,
          rank: offset + index + 1,
        };
      })
    );

    return {
      players: enriched,
      total: players.length,
      offset,
      limit,
    };
  },
});

// All companies sorted by market cap (with pagination)
export const getAllCompaniesSorted = query({
  args: {
    sortBy: v.optional(v.union(v.literal("marketCap"), v.literal("balance"))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { sortBy = "marketCap", limit = 50, offset = 0 } = args;
    const companies = await ctx.db.query("companies").collect();

    // Sort companies
    const sorted = companies.sort((a, b) => {
      const field = sortBy as keyof typeof a;
      const aVal = (a[field] as number) || 0;
      const bVal = (b[field] as number) || 0;
      return bVal - aVal;
    });

    // Apply pagination
    const paginated = sorted.slice(offset, offset + limit);

    // Enrich with owner info and calculate rank
    const enriched = await Promise.all(
      paginated.map(async (company, index) => {
        const owner = await ctx.db.get(company.ownerId);
        const ownerUser = owner ? await ctx.db.get(owner.userId) : null;
        return {
          ...company,
          ownerName: ownerUser?.name || "Anonymous",
          ownerImage: ownerUser?.image,
          rank: offset + index + 1,
        };
      })
    );

    return {
      companies: enriched,
      total: companies.length,
      offset,
      limit,
    };
  },
});

// All products sorted by revenue (with pagination)
export const getAllProductsSorted = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { limit = 50, offset = 0 } = args;
    const products = await ctx.db.query("products").collect();

    // Sort by revenue descending
    const sorted = products
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(offset, offset + limit);

    // Enrich with company info and calculate rank
    const enriched = await Promise.all(
      sorted.map(async (product, index) => {
        const company = await ctx.db.get(product.companyId);
        return {
          ...product,
          companyName: company?.name || "Unknown",
          companyLogo: company?.logo,
          ticker: company?.ticker || "N/A",
          rank: offset + index + 1,
        };
      })
    );

    return {
      products: enriched,
      total: products.length,
      offset,
      limit,
    };
  },
});

// Search players by name
export const searchPlayers = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { query: searchQuery, limit = 20 } = args;
    const users = await ctx.db.query("users").collect();
    const matchingUsers = users.filter((u) =>
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get players for matching users
    const results = await Promise.all(
      matchingUsers.slice(0, limit).map(async (user) => {
        const players = await ctx.db.query("players").collect();
        const player = players.find((p) => p.userId === user._id);

        return player
          ? {
              ...player,
              userName: user.name || "Anonymous",
            }
          : null;
      })
    );

    return results.filter(Boolean);
  },
});

// Search companies by name or ticker
export const searchCompanies = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { query: searchQuery, limit = 20 } = args;
    const companies = await ctx.db.query("companies").collect();

    const matchingCompanies = companies
      .filter((c) => {
        const nameMatch = c.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const tickerMatch = c.ticker
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
        return nameMatch || tickerMatch;
      })
      .slice(0, limit);

    // Enrich with owner info
    const enriched = await Promise.all(
      matchingCompanies.map(async (company) => {
        const owner = await ctx.db.get(company.ownerId);
        const ownerUser = owner ? await ctx.db.get(owner.userId) : null;
        return {
          ...company,
          ownerName: ownerUser?.name || "Anonymous",
          ownerImage: ownerUser?.image,
        };
      })
    );

    return enriched;
  },
});

// Search products by name
export const searchProducts = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { query: searchQuery, limit = 20 } = args;
    const products = await ctx.db.query("products").collect();

    const matchingProducts = products
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, limit);

    // Enrich with company info
    const enriched = await Promise.all(
      matchingProducts.map(async (product) => {
        const company = await ctx.db.get(product.companyId);
        return {
          ...product,
          companyName: company?.name || "Unknown",
          companyLogo: company?.logo,
          ticker: company?.ticker || "N/A",
        };
      })
    );

    return enriched;
  },
});
