import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Mutation: Add item to cart
export const addToCart = mutation({
  args: {
    userId: v.id("players"),
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

    if (!product.isActive || product.isArchived) {
      throw new Error("Product is not available");
    }

    // Check stock availability
    if (product.stock !== undefined && product.stock !== null && product.stock < args.quantity) {
      throw new Error("Insufficient stock");
    }

    // Check max per order
    if (product.maxPerOrder && args.quantity > product.maxPerOrder) {
      throw new Error(`Maximum ${product.maxPerOrder} units per order`);
    }

    // Get or create cart
    let cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const now = Date.now();

    if (!cart) {
      const cartId = await ctx.db.insert("carts", {
        userId: args.userId,
        totalPrice: 0,
        createdAt: now,
        updatedAt: now,
      });
      cart = await ctx.db.get(cartId);
      if (!cart) throw new Error("Failed to create cart");
    }

    // Check if product already in cart
    const existingItem = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .unique();

    if (existingItem) {
      // Update quantity
      await ctx.db.patch(existingItem._id, {
        quantity: existingItem.quantity + args.quantity,
      });
    } else {
      // Add new item
      await ctx.db.insert("cartItems", {
        cartId: cart._id,
        productId: args.productId,
        quantity: args.quantity,
        pricePerUnit: product.price,
      });
    }

    // Update cart total
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    const totalPrice = cartItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);

    await ctx.db.patch(cart._id, {
      totalPrice,
      updatedAt: now,
    });

    return cart._id;
  },
});

// Mutation: Remove item from cart
export const removeFromCart = mutation({
  args: {
    userId: v.id("players"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) {
      throw new Error("Cart not found");
    }

    const cartItem = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .unique();

    if (!cartItem) {
      throw new Error("Item not in cart");
    }

    await ctx.db.delete(cartItem._id);

    // Update cart total
    const remainingItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    const totalPrice = remainingItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);

    await ctx.db.patch(cart._id, {
      totalPrice,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Update cart item quantity
export const updateCartItemQuantity = mutation({
  args: {
    userId: v.id("players"),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) {
      throw new Error("Cart not found");
    }

    const cartItem = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .unique();

    if (!cartItem) {
      throw new Error("Item not in cart");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check stock
    if (product.stock !== undefined && product.stock !== null && product.stock < args.quantity) {
      throw new Error("Insufficient stock");
    }

    await ctx.db.patch(cartItem._id, {
      quantity: args.quantity,
    });

    // Update cart total
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    const totalPrice = cartItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);

    await ctx.db.patch(cart._id, {
      totalPrice,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Checkout cart
export const checkout = mutation({
  args: {
    userId: v.id("players"),
    accountType: v.union(v.literal("player"), v.literal("company")),
    accountId: v.union(v.id("players"), v.id("companies")),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) {
      throw new Error("Cart is empty");
    }

    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Verify stock and calculate total
    let total = 0;
    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product || !product.isActive || product.isArchived) {
        throw new Error(`Product ${item.productId} is not available`);
      }
      if (product.stock !== undefined && product.stock !== null && product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      total += product.price * item.quantity; // Use current price
    }

    // Check balance
    if (args.accountType === "player") {
      const playerId = args.accountId as Id<"players">;
      const player = await ctx.db.get(playerId);
      if (!player || player.balance < total) {
        throw new Error("Insufficient balance");
      }
      await ctx.db.patch(playerId, {
        balance: player.balance - total,
        updatedAt: Date.now(),
      });
    } else {
      const companyId = args.accountId as Id<"companies">;
      const company = await ctx.db.get(companyId);
      if (!company || company.balance < total) {
        throw new Error("Insufficient balance");
      }
      await ctx.db.patch(companyId, {
        balance: company.balance - total,
        updatedAt: Date.now(),
      });
    }

    const now = Date.now();

    // Process each item
    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      // Update stock
      if (product.stock !== undefined && product.stock !== null) {
        await ctx.db.patch(item.productId, {
          stock: product.stock - item.quantity,
          updatedAt: now,
        });
      }

      // Update product revenue and sales
      await ctx.db.patch(item.productId, {
        totalRevenue: product.totalRevenue + product.price * item.quantity,
        totalSold: product.totalSold + item.quantity,
        updatedAt: now,
      });

      // Credit company
      const company = await ctx.db.get(product.companyId);
      if (company) {
        await ctx.db.patch(product.companyId, {
          balance: company.balance + product.price * item.quantity,
          updatedAt: now,
        });
      }

      // Create marketplace sale record
      await ctx.db.insert("marketplaceSales", {
        productId: item.productId,
        companyId: product.companyId,
        quantity: item.quantity,
        purchaserId: args.userId,
        purchaserType: "player" as const,
        totalPrice: product.price * item.quantity,
        createdAt: now,
      });

      // Create transaction
      await ctx.db.insert("transactions", {
        fromAccountId: args.accountId,
        fromAccountType: args.accountType,
        toAccountId: product.companyId,
        toAccountType: "company" as const,
        amount: product.price * item.quantity,
        assetType: "product" as const,
        assetId: item.productId,
        description: `Purchased ${item.quantity}x ${product.name}`,
        createdAt: now,
      });

      // Delete cart item
      await ctx.db.delete(item._id);
    }

    // Clear cart
    await ctx.db.patch(cart._id, {
      totalPrice: 0,
      updatedAt: now,
    });

    return { success: true, total };
  },
});

// Query: Get player's cart
export const getPlayerCart = query({
  args: {
    userId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) {
      return null;
    }

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    return { cart, items };
  },
});

// Query: Get cart item count
export const getCartItemCount = query({
  args: {
    userId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!cart) return 0;

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
      .collect();

    return items.reduce((sum, item) => sum + item.quantity, 0);
  },
});
