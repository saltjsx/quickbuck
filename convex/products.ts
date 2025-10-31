import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { canCreateContent } from "./moderation";
import { validateName, validateDescription, validateTags } from "./contentFilter";

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

    // ROLE CHECK: Verify company owner can create products
    const canCreate = await canCreateContent(ctx, company.ownerId);
    if (!canCreate) {
      throw new Error("Your account does not have permission to create products");
    }

    // HARD LIMIT: Check if company has reached max products (30)
    const companyProducts = await ctx.db
      .query("products")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();
    
    if (companyProducts.length >= 30) {
      throw new Error("Your company has reached the maximum limit of 30 products. Delete an existing product to create a new one.");
    }

    // CONTENT FILTER: Validate product name, description, and tags
    const validatedName = validateName(args.name, "Product name");
    const validatedDescription = validateDescription(args.description, "Product description");
    const validatedTags = validateTags(args.tags);

    // EXPLOIT FIX: Validate price is positive and safe integer
    if (args.price <= 0) {
      throw new Error("Price must be greater than 0");
    }

    if (!Number.isSafeInteger(args.price)) {
      throw new Error("Price is not a safe integer");
    }

    // EXPLOIT FIX: Set reasonable price limits
    const MAX_PRICE = 100000000; // $1M max price
    if (args.price > MAX_PRICE) {
      throw new Error(`Price cannot exceed $${MAX_PRICE / 100}`);
    }

    // EXPLOIT FIX: Validate maxPerOrder if provided
    if (args.maxPerOrder !== undefined) {
      if (args.maxPerOrder <= 0 || !Number.isSafeInteger(args.maxPerOrder)) {
        throw new Error("Invalid maxPerOrder value");
      }
    }

    const now = Date.now();

    // EXPLOIT FIX: Store production cost as percentage (35%-67%) instead of absolute value
    // This prevents the exploit where users create cheap products then increase price
    // while maintaining the original low production cost
    const productionCostPercentage = 0.35 + Math.random() * 0.32; // 0.35 to 0.67

    const productId = await ctx.db.insert("products", {
      companyId: args.companyId,
      name: validatedName,
      description: validatedDescription,
      price: args.price,
      productionCostPercentage: productionCostPercentage,
      image: args.image,
      tags: validatedTags,
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
    // EXPLOIT FIX: Validate quantity is positive and safe integer
    if (args.quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    if (!Number.isSafeInteger(args.quantity)) {
      throw new Error("Quantity is not a safe integer");
    }

    // EXPLOIT FIX: Set max batch size
    const MAX_BATCH_SIZE = 1000000; // 1 million units max per batch
    if (args.quantity > MAX_BATCH_SIZE) {
      throw new Error(`Batch size cannot exceed ${MAX_BATCH_SIZE} units`);
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const company = await ctx.db.get(product.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // EXPLOIT FIX: Calculate production cost from percentage and CURRENT price
    // This prevents the exploit where price is increased after creation
    // Handle legacy products with productionCost field
    const productionCostPercentage = product.productionCostPercentage ?? 0.35; // Default to 35%
    const productionCost = Math.floor(product.price * productionCostPercentage);

    // Calculate total production cost for this batch
    const totalCost = productionCost * args.quantity;

    // EXPLOIT FIX: Validate total cost is safe
    if (!Number.isSafeInteger(totalCost)) {
      throw new Error("Total cost calculation overflow");
    }

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

    // CONTENT FILTER: Validate updated fields if provided
    const validatedUpdates: any = { ...updates };
    
    if (updates.name !== undefined) {
      validatedUpdates.name = validateName(updates.name, "Product name");
    }
    
    if (updates.description !== undefined) {
      validatedUpdates.description = validateDescription(updates.description, "Product description");
    }
    
    if (updates.tags !== undefined) {
      validatedUpdates.tags = validateTags(updates.tags);
    }

    // PRICE CHANGE COOLDOWN: Enforce 2-day cooldown between price changes
    if (updates.price !== undefined && updates.price !== product.price) {
      const now = Date.now();
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000; // 2 days
      
      if (product.lastPriceChange) {
        const timeSinceLastChange = now - product.lastPriceChange;
        if (timeSinceLastChange < twoDaysInMs) {
          const hoursRemaining = Math.ceil((twoDaysInMs - timeSinceLastChange) / (60 * 60 * 1000));
          throw new Error(
            `You can only change the price once every 2 days. Please wait ${hoursRemaining} more hours.`
          );
        }
      }
      
      // Track the price change timestamp
      validatedUpdates.lastPriceChange = now;
    }

    // Production cost should never change after product creation
    // It represents the fixed cost to manufacture the product
    await ctx.db.patch(productId, {
      ...validatedUpdates,
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// Mutation: Delete product
export const deleteProduct = mutation({
  args: {
    productId: v.id("products"),
    ownerId: v.id("players"), // For validation
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Verify ownership
    const company = await ctx.db.get(product.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    if (company.ownerId !== args.ownerId) {
      throw new Error("Only the company owner can delete products");
    }

    // Actually delete the product
    await ctx.db.delete(args.productId);

    return {
      productId: args.productId,
      message: "Product deleted successfully",
    };
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
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100; // Default 100, helps with large companies
    
    const products = await ctx.db
      .query("products")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .take(limit);
    
    // Return only essential fields to reduce bandwidth
    return products.map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      price: p.price,
      productionCostPercentage: p.productionCostPercentage, // Needed for cost calculations
      image: p.image,
      stock: p.stock,
      isActive: p.isActive,
      isArchived: p.isArchived,
      totalSold: p.totalSold,
      totalRevenue: p.totalRevenue,
      qualityRating: p.qualityRating,
      maxPerOrder: p.maxPerOrder,
      tags: p.tags,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      companyId: p.companyId,
    }));
  },
});

// Query: Get all products (for marketplace)
export const getAllProducts = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 200); // Default 100, max 200
    const offset = args.offset || 0;
    
    // Fetch with pagination
    const allProducts = await ctx.db
      .query("products")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1000); // Max 1000 total to prevent excessive queries
    
    const paginatedProducts = allProducts.slice(offset, offset + limit);
    
    // Return only essential fields for marketplace display
    return paginatedProducts.map(p => ({
      _id: p._id,
      companyId: p.companyId,
      name: p.name,
      description: p.description,
      price: p.price,
      image: p.image,
      tags: p.tags,
      stock: p.stock,
      maxPerOrder: p.maxPerOrder,
      totalSold: p.totalSold,
      qualityRating: p.qualityRating,
    }));
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
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 20, 50); // Default 20, max 50
    
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) => q.eq("fromAccountId", args.companyId))
      .filter((q) => q.eq(q.field("assetType"), "product"))
      .order("desc")
      .take(limit);

    // Enrich with product details - only fetch needed fields
    const enriched = await Promise.all(
      transactions.map(async (tx) => {
        if (!tx.assetId) {
          return { 
            _id: tx._id,
            description: tx.description,
            amount: tx.amount,
            createdAt: tx.createdAt,
            productName: "Unknown", 
            productImage: undefined,
            productPrice: undefined,
          };
        }
        const product = await ctx.db.get(tx.assetId as Id<"products">);
        return {
          _id: tx._id,
          description: tx.description,
          amount: tx.amount,
          createdAt: tx.createdAt,
          productName: product?.name || "Unknown",
          productImage: product?.image,
          productPrice: product?.price,
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
    const sorted = products
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, args.limit);
    
    // Enrich with company details
    const enriched = await Promise.all(
      sorted.map(async (product) => {
        const company = await ctx.db.get(product.companyId);
        return {
          ...product,
          companyName: company?.name || "Unknown",
          companyLogo: company?.logo,
        };
      })
    );
    
    return enriched;
  },
});

// Query: Get top products by sales volume
export const getTopProductsBySales = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    const sorted = products
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, args.limit);
    
    // Enrich with company details
    const enriched = await Promise.all(
      sorted.map(async (product) => {
        const company = await ctx.db.get(product.companyId);
        return {
          ...product,
          companyName: company?.name || "Unknown",
          companyLogo: company?.logo,
        };
      })
    );
    
    return enriched;
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

