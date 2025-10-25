import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Mutation: Create product (no initial stock, just the product listing)
export const createProduct = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // in cents - selling price to customers
    image: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    maxPerOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    if (args.price <= 0) {
      throw new Error("Price must be greater than 0");
    }

    const now = Date.now();

    // Calculate production cost (35%-67% of selling price)
    const costPercentage = 0.35 + Math.random() * 0.32;
    const productionCost = Math.floor(args.price * costPercentage);

    const productId = await ctx.db.insert("products", {
      companyId: args.companyId,
      name: args.name,
      description: args.description,
      price: args.price,
      productionCost: productionCost,
      image: args.image,
      tags: args.tags,
      stock: 0, // Start with 0 stock - must order batches
      maxPerOrder: args.maxPerOrder,
      totalRevenue: 0,
      totalSold: 0,
      qualityRating: 0.5, // Default quality
      isActive: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    return productId;
  },
});

// Mutation: Order a batch of products (manufacture inventory)
export const orderProductBatch = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const company = await ctx.db.get(product.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Calculate total production cost for this batch
    const totalCost = product.productionCost * args.quantity;

    // Check if company has sufficient balance
    if (company.balance < totalCost) {
      throw new Error(
        `Insufficient balance. Need ${totalCost / 100} but have ${company.balance / 100}`
      );
    }

    const now = Date.now();

    // Deduct cost from company balance
    await ctx.db.patch(product.companyId, {
      balance: company.balance - totalCost,
      updatedAt: now,
    });

    // Add stock to product
    await ctx.db.patch(args.productId, {
      stock: (product.stock || 0) + args.quantity,
      updatedAt: now,
    });

    // Create transaction record
    await ctx.db.insert("transactions", {
      fromAccountId: product.companyId,
      fromAccountType: "company" as const,
      toAccountId: product.companyId,
      toAccountType: "company" as const,
      amount: totalCost,
      assetType: "product" as const,
      assetId: args.productId,
      description: `Ordered ${args.quantity} units of ${product.name}`,
      createdAt: now,
    });

    return {
      productId: args.productId,
      quantity: args.quantity,
      totalCost,
      newStock: (product.stock || 0) + args.quantity,
    };
  },
});

// Mutation: Update product (metadata only, not stock or production cost)
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    image: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    maxPerOrder: v.optional(v.number()),
    qualityRating: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { productId, ...updates } = args;
    
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // If price is being updated, recalculate production cost
    let productionCost = product.productionCost;
    if (updates.price !== undefined) {
      const costPercentage = 0.35 + Math.random() * 0.32;
      productionCost = Math.floor(updates.price * costPercentage);
    }

    await ctx.db.patch(productId, {
      ...updates,
      productionCost,
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// Mutation: Update product stock
export const updateProductStock = mutation({
  args: {
    productId: v.id("products"),
    quantityChange: v.number(), // can be negative for sales
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (product.stock === undefined || product.stock === null) {
      // Unlimited stock, no update needed
      return;
    }

    const newStock = product.stock + args.quantityChange;
    if (newStock < 0) {
      throw new Error("Insufficient stock");
    }

    await ctx.db.patch(args.productId, {
      stock: newStock,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Record product sale
export const recordProductSale = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    totalPrice: v.number(), // in cents
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.patch(args.productId, {
      totalRevenue: product.totalRevenue + args.totalPrice,
      totalSold: product.totalSold + args.quantity,
      updatedAt: Date.now(),
    });
  },
});

// Query: Get product
export const getProduct = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId);
  },
});

// Query: Get company's products
export const getCompanyProducts = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

// Query: Get all products (for marketplace)
export const getAllProducts = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Query: Search products
export const searchProducts = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const allProducts = await ctx.db
      .query("products")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const searchLower = args.query.toLowerCase();
    
    return allProducts.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(searchLower);
      const descMatch = product.description?.toLowerCase().includes(searchLower);
      const tagMatch = product.tags?.some((tag) => 
        tag.toLowerCase().includes(searchLower)
      );
      
      return nameMatch || descMatch || tagMatch;
    });
  },
});

// Query: Get products by price range
export const getProductsByPriceRange = query({
  args: {
    minPrice: v.number(),
    maxPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const allProducts = await ctx.db
      .query("products")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    return allProducts.filter(
      (p) => p.price >= args.minPrice && p.price <= args.maxPrice
    );
  },
});

// Query: Get product batch order history
export const getProductBatchOrders = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) => q.eq("fromAccountId", args.companyId))
      .filter((q) => q.eq(q.field("assetType"), "product"))
      .order("desc")
      .take(50);

    // Enrich with product names
    const enriched = await Promise.all(
      transactions.map(async (tx) => {
        if (!tx.assetId) return { ...tx, productName: "Unknown" };
        const product = await ctx.db.get(tx.assetId as Id<"products">);
        return {
          ...tx,
          productName: product?.name || "Unknown",
        };
      })
    );

    return enriched;
  },
});

// Query: Get top products by revenue
export const getTopProductsByRevenue = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    return products
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, args.limit);
  },
});

// Query: Get top products by sales volume
export const getTopProductsBySales = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    return products
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, args.limit);
  },
});

// Query: Get player inventory
export const getPlayerInventory = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const inventory = await ctx.db
      .query("playerInventory")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Enrich with product and company data
    const enriched = await Promise.all(
      inventory.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        let companyName = "Unknown";
        if (product) {
          const company = await ctx.db.get(product.companyId);
          if (company) {
            companyName = company.name;
          }
        }
        return {
          ...item,
          product,
          companyName,
          productName: product?.name || "Unknown",
          productImage: product?.image,
        };
      })
    );

    return enriched;
  },
});

