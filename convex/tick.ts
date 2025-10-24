import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

// Shared tick execution logic
async function executeTickLogic(ctx: any) {
  const now = Date.now();
  
  // Get last tick number
  const lastTick = await ctx.db
    .query("tickHistory")
    .withIndex("by_tickNumber")
    .order("desc")
    .first();
  
  const tickNumber = (lastTick?.tickNumber || 0) + 1;
  
  console.log(`Executing tick #${tickNumber}`);
  
  // Get global config for budget
  const gameConfigDoc = await ctx.db
    .query("gameConfig")
    .withIndex("by_key", (q: any) => q.eq("key", "botBudget"))
    .first();
  
  const botBudget = gameConfigDoc?.value || 10000000; // Default $100,000 in cents
  
  // Step 1: Bot purchases from marketplace
  const botPurchases = await executeBotPurchases(ctx, botBudget);
  
  // Step 2: Update stock prices based on algorithm
  const stockPriceUpdates = await updateStockPrices(ctx);
  
  // Step 3: Update crypto prices based on algorithm
  const cryptoPriceUpdates = await updateCryptoPrices(ctx);
  
  // Step 4: Apply loan interest
  await applyLoanInterest(ctx);
  
  // Step 5: Record tick history
  const tickId = await ctx.db.insert("tickHistory", {
    tickNumber,
    timestamp: now,
    botPurchases,
    stockPriceUpdates,
    cryptoPriceUpdates,
    totalBudgetSpent: botPurchases.reduce((sum, p) => sum + p.totalPrice, 0),
  });
  
  console.log(`Tick #${tickNumber} completed`);
  
  return {
    tickNumber,
    tickId,
    botPurchases: botPurchases.length,
    stockUpdates: stockPriceUpdates?.length || 0,
    cryptoUpdates: cryptoPriceUpdates?.length || 0,
  };
}

// Main tick mutation - runs every 5 minutes via cron
export const executeTick = internalMutation({
  handler: async (ctx) => {
    return await executeTickLogic(ctx);
  },
});

// Manual trigger for testing (can be called from admin dashboard)
export const manualTick = mutation({
  handler: async (ctx) => {
    return await executeTickLogic(ctx);
  },
});

// Bot purchase logic based on AUTO_PRODUCT_ALGO.md
async function executeBotPurchases(ctx: any, totalBudget: number) {
  console.log(`Bot purchasing with budget: $${totalBudget / 100}`);
  
  const purchases: Array<{
    productId: any;
    companyId: any;
    quantity: number;
    totalPrice: number;
  }> = [];
  
  // Get all active products
  const products = await ctx.db
    .query("products")
    .withIndex("by_isActive", (q: any) => q.eq("isActive", true))
    .collect();
  
  if (products.length === 0) {
    console.log("No active products found");
    return purchases;
  }
  
  // Filter out invalid products
  const eligibleProducts = products.filter((p: any) => {
    return (
      !p.isArchived &&
      p.price > 0 &&
      p.price <= 5000000 && // $50,000 cap
      (p.stock === undefined || p.stock === null || p.stock > 0)
    );
  });
  
  if (eligibleProducts.length === 0) {
    console.log("No eligible products");
    return purchases;
  }
  
  // Calculate attractiveness scores
  const scoredProducts = eligibleProducts.map((product: any) => {
    // Quality rating (0-1)
    const q = product.qualityRating || 0.5;
    
    // Price preference (favor medium prices)
    const priceInDollars = product.price / 100;
    const logPrice = Math.log(product.price + 1);
    const avgLogPrice = Math.log(100000); // ~$1000 sweet spot
    const priceZ = (logPrice - avgLogPrice) / 2;
    const pricePreferenceScore = Math.exp(-(priceZ ** 2) / 2);
    
    // Unit price penalty (reduce allocation for expensive items)
    const unitPricePenalty = 1 / (1 + Math.pow(priceInDollars / 5000, 1.2));
    
    // Demand score (based on recent sales)
    const demandScore = Math.min((product.totalSold || 0) / 100, 1);
    
    // Combined score
    const rawAttractiveness =
      (0.4 * q + 0.3 * pricePreferenceScore + 0.2 * demandScore + 0.1) *
      unitPricePenalty;
    
    return {
      product,
      score: Math.max(0, Math.min(1, rawAttractiveness)),
    };
  });
  
  // Calculate total score
  const totalScore = scoredProducts.reduce((sum: number, p: any) => sum + p.score, 0);
  
  if (totalScore === 0) {
    console.log("Total score is zero");
    return purchases;
  }
  
  let remainingBudget = totalBudget;
  
  // Allocate budget proportionally
  for (const { product, score } of scoredProducts) {
    if (remainingBudget <= 0) break;
    
    // Calculate desired spend
    const desiredSpend = Math.floor((score / totalScore) * totalBudget);
    
    if (desiredSpend < product.price) continue;
    
    // Calculate quantity
    let quantity = Math.floor(desiredSpend / product.price);
    
    // Apply stock constraints
    if (product.stock !== undefined && product.stock !== null) {
      quantity = Math.min(quantity, product.stock);
    }
    
    // Apply max per order
    if (product.maxPerOrder) {
      quantity = Math.min(quantity, product.maxPerOrder);
    }
    
    if (quantity <= 0) continue;
    
    const totalPrice = quantity * product.price;
    
    if (totalPrice > remainingBudget) {
      quantity = Math.floor(remainingBudget / product.price);
      if (quantity <= 0) continue;
    }
    
    const actualPrice = quantity * product.price;
    
    // Update product stock
    if (product.stock !== undefined && product.stock !== null) {
      await ctx.db.patch(product._id, {
        stock: product.stock - quantity,
        totalSold: product.totalSold + quantity,
        totalRevenue: product.totalRevenue + actualPrice,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(product._id, {
        totalSold: product.totalSold + quantity,
        totalRevenue: product.totalRevenue + actualPrice,
        updatedAt: Date.now(),
      });
    }
    
    // Credit company
    const company = await ctx.db.get(product.companyId);
    if (company) {
      await ctx.db.patch(product.companyId, {
        balance: company.balance + actualPrice,
        updatedAt: Date.now(),
      });
    }
    
    // Record sale
    await ctx.db.insert("marketplaceSales", {
      productId: product._id,
      companyId: product.companyId,
      quantity,
      purchaserId: "bot" as const,
      purchaserType: "bot" as const,
      totalPrice: actualPrice,
      createdAt: Date.now(),
    });
    
    // Log transaction for bot purchase
    await ctx.db.insert("transactions", {
      fromAccountId: "bot" as any,
      fromAccountType: "bot" as any,
      toAccountId: product.companyId,
      toAccountType: "company" as const,
      amount: actualPrice,
      assetType: "product" as const,
      assetId: product._id as any,
      description: `Bot purchased ${quantity}x ${product.name} at $${product.price / 100}`,
      createdAt: Date.now(),
    });
    
    purchases.push({
      productId: product._id,
      companyId: product.companyId,
      quantity,
      totalPrice: actualPrice,
    });
    
    remainingBudget -= actualPrice;
  }
  
  console.log(`Bot made ${purchases.length} purchases`);
  return purchases;
}

// Update stock prices based on STOCK_MARKET_ALGO.md
async function updateStockPrices(ctx: any) {
  const stocks = await ctx.db.query("stocks").collect();
  
  const updates: Array<{
    stockId: any;
    oldPrice: number;
    newPrice: number;
  }> = [];
  
  for (const stock of stocks) {
    const company = await ctx.db.get(stock.companyId);
    if (!company || !company.isPublic) continue;
    
    // Calculate fundamental price based on company metrics
    const revenueAnnual = company.revenueAnnual || company.balance * 4; // Estimate if not set
    const baseMultiple = company.fundamentalMultiple || 6.67;
    const growthFactor = (company.growthRate || 0) * 0.5 / 100;
    const sentimentFactor = (company.sentiment || 0) * 0.2;
    
    const multiple = baseMultiple * (1 + growthFactor + sentimentFactor);
    const fundamentalMarketCap = Math.floor(revenueAnnual * multiple);
    const fundamentalPrice = Math.floor(fundamentalMarketCap / stock.totalShares);
    
    // Price movement (simplified - random walk with mean reversion)
    const currentPrice = stock.price;
    const alpha = 0.08; // Mean reversion factor
    const volatility = company.volatilityEst || 0.6;
    const tickVolatility = volatility / Math.sqrt(105120); // 5-min ticks, 24/7
    
    // Random component
    const randomFactor = 1 + tickVolatility * (Math.random() * 2 - 1);
    
    // Mean reversion toward fundamental
    const targetPrice = currentPrice * randomFactor;
    const newPrice = Math.floor(
      targetPrice * (1 - alpha) + fundamentalPrice * alpha
    );
    
    // Ensure price is positive and not too volatile (max 20% change per tick)
    const maxChange = currentPrice * 0.2;
    const clampedPrice = Math.max(
      Math.floor(currentPrice * 0.8),
      Math.min(Math.floor(currentPrice * 1.2), newPrice)
    );
    
    const finalPrice = Math.max(100, clampedPrice); // Min $1.00
    
    if (finalPrice !== currentPrice) {
      const newMarketCap = finalPrice * stock.totalShares;
      
      await ctx.db.patch(stock._id, {
        previousPrice: currentPrice,
        price: finalPrice,
        marketCap: newMarketCap,
        updatedAt: Date.now(),
      });
      
      await ctx.db.patch(stock.companyId, {
        marketCap: newMarketCap,
        updatedAt: Date.now(),
      });
      
      // Record price history for charting
      await ctx.db.insert("stockPriceHistory", {
        stockId: stock._id,
        price: finalPrice,
        timestamp: Date.now(),
      });
      
      updates.push({
        stockId: stock._id,
        oldPrice: currentPrice,
        newPrice: finalPrice,
      });
    }
  }
  
  return updates;
}

// Update crypto prices based on CRYPTO_MARKET_ALGO.md
async function updateCryptoPrices(ctx: any) {
  const cryptos = await ctx.db.query("cryptocurrencies").collect();
  
  const updates: Array<{
    cryptoId: any;
    oldPrice: number;
    newPrice: number;
  }> = [];
  
  for (const crypto of cryptos) {
    // Simplified crypto price movement (higher volatility than stocks)
    const currentPrice = crypto.price;
    const volatility = crypto.volatilityEst || 1.2; // Higher default
    const tickVolatility = volatility / Math.sqrt(105120);
    
    // Random walk with no mean reversion (crypto is more speculative)
    const randomFactor = 1 + tickVolatility * (Math.random() * 2 - 1) * 2; // 2x multiplier
    
    let newPrice = Math.floor(currentPrice * randomFactor);
    
    // Clamp to reasonable range (max 30% change per tick)
    newPrice = Math.max(
      Math.floor(currentPrice * 0.7),
      Math.min(Math.floor(currentPrice * 1.3), newPrice)
    );
    
    newPrice = Math.max(1, newPrice); // Min $0.01
    
    if (newPrice !== currentPrice) {
      const newMarketCap = Math.floor(newPrice * crypto.circulatingSupply);
      
      await ctx.db.patch(crypto._id, {
        previousPrice: currentPrice,
        price: newPrice,
        marketCap: newMarketCap,
        updatedAt: Date.now(),
      });
      
      // Record price history for charting
      await ctx.db.insert("cryptoPriceHistory", {
        cryptoId: crypto._id,
        price: newPrice,
        timestamp: Date.now(),
      });
      
      updates.push({
        cryptoId: crypto._id,
        oldPrice: currentPrice,
        newPrice: newPrice,
      });
    }
  }
  
  return updates;
}

// Apply daily loan interest
async function applyLoanInterest(ctx: any) {
  const activeLoans = await ctx.db
    .query("loans")
    .withIndex("by_status", (q: any) => q.eq("status", "active"))
    .collect();
  
  const now = Date.now();
  const twentyMinutesMs = 20 * 60 * 1000;
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  for (const loan of activeLoans) {
    const timeSinceLastInterest = now - loan.lastInterestApplied;
    
    // Apply interest proportionally for 20-minute intervals
    // 5% daily = 5% / 72 per 20-minute interval (72 intervals per day)
    if (timeSinceLastInterest >= twentyMinutesMs) {
      const dailyRate = loan.interestRate / 100; // 5% = 0.05
      const intervalRate = dailyRate / 72; // 72 twenty-minute intervals per day
      
      const interestAmount = Math.floor(loan.remainingBalance * intervalRate);
      
      if (interestAmount > 0) {
        const newBalance = loan.remainingBalance + interestAmount;
        const newAccruedInterest = loan.accruedInterest + interestAmount;
        
        await ctx.db.patch(loan._id, {
          remainingBalance: newBalance,
          accruedInterest: newAccruedInterest,
          lastInterestApplied: now,
        });
        
        // Deduct from player balance (allow negative)
        const player = await ctx.db.get(loan.playerId);
        if (player) {
          await ctx.db.patch(loan.playerId, {
            balance: player.balance - interestAmount,
            updatedAt: now,
          });
        }
      }
    }
  }
}
