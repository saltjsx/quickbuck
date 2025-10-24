import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Mutation: Create product
export const createProduct = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // in cents
    productionCost: v.number(), // in cents
    image: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    stock: v.optional(v.number()), // null/undefined means unlimited
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

    const productId = await ctx.db.insert("products", {
      companyId: args.companyId,
      name: args.name,
      description: args.description,
      price: args.price,
      productionCost: args.productionCost,
      image: args.image,
      tags: args.tags,
      stock: args.stock,
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

// Mutation: Update product
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    productionCost: v.optional(v.number()),
    image: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    stock: v.optional(v.number()),
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

    await ctx.db.patch(productId, {
      ...updates,
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
