import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    clerkUsername: v.optional(v.string()), // Clerk username identifier
    tokenIdentifier: v.string(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),
  
  // Game tables
  players: defineTable({
    userId: v.id("users"),
    balance: v.number(), // in cents
    netWorth: v.number(), // in cents, calculated field
    role: v.optional(v.union(
      v.literal("normal"),
      v.literal("limited"),
      v.literal("banned"),
      v.literal("mod"),
      v.literal("admin")
    )), // Player role - defaults to "normal"
    limitReason: v.optional(v.string()), // Reason for limited account
    banReason: v.optional(v.string()), // Reason for ban
    warnings: v.optional(v.array(v.object({
      reason: v.string(),
      createdAt: v.number(),
    }))), // List of warnings
    warningCount: v.optional(v.number()), // Total warnings (for quick access)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_role", ["role"]),

  companies: defineTable({
    ownerId: v.id("players"),
    name: v.string(),
    ticker: v.optional(v.string()), // only for public companies
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    balance: v.number(), // in cents
    marketCap: v.optional(v.number()), // in cents, for public companies
    isPublic: v.boolean(),
    // Stock market algorithm fields
    revenueAnnual: v.optional(v.number()), // in cents
    ebitdaAnnual: v.optional(v.number()), // in cents
    profitMargin: v.optional(v.number()), // percentage (0-100)
    growthRate: v.optional(v.number()), // annualized percentage
    sector: v.optional(v.string()), // "growth" or "value"
    fundamentalMultiple: v.optional(v.number()),
    sharesOutstanding: v.optional(v.number()),
    liquidityScore: v.optional(v.number()), // 0-1
    volatilityEst: v.optional(v.number()), // annualized
    sentiment: v.optional(v.number()), // -1 to 1
    newsScore: v.optional(v.number()), // short-term modifier
    reputationScore: v.number(), // 0-1
    flaggedStatus: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_isPublic", ["isPublic"])
    .index("by_ticker", ["ticker"]),

  products: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // in cents
    productionCostPercentage: v.optional(v.number()), // 0-1, percentage of price (e.g., 0.35 = 35%)
    productionCost: v.optional(v.number()), // DEPRECATED: old field, kept for backwards compatibility
    image: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    stock: v.optional(v.number()), // null means unlimited
    totalRevenue: v.number(), // in cents
    totalSold: v.number(),
    recentSalesCount: v.optional(v.number()), // sliding window
    qualityRating: v.number(), // 0-1
    isActive: v.boolean(),
    isArchived: v.boolean(),
    maxPerOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_isActive", ["isActive"])
    .index("by_price", ["price"]),

  stocks: defineTable({
    companyId: v.id("companies"),
    ticker: v.string(),
    price: v.number(), // in cents, current price
    previousPrice: v.optional(v.number()), // in cents
    totalShares: v.number(),
    marketCap: v.number(), // in cents
    volume5min: v.optional(v.number()),
    high52w: v.optional(v.number()),
    low52w: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_ticker", ["ticker"]),

  userStockHoldings: defineTable({
    userId: v.id("players"),
    companyId: v.id("companies"),
    stockId: v.id("stocks"),
    shares: v.number(),
    averagePurchasePrice: v.number(), // in cents
    boughtAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_companyId", ["companyId"])
    .index("by_userId_companyId", ["userId", "companyId"]),

  carts: defineTable({
    userId: v.id("players"),
    totalPrice: v.number(), // in cents
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  cartItems: defineTable({
    cartId: v.id("carts"),
    productId: v.id("products"),
    quantity: v.number(),
    pricePerUnit: v.number(), // in cents, snapshot at add time
  })
    .index("by_cartId", ["cartId"])
    .index("by_productId", ["productId"]),

  transactions: defineTable({
    fromAccountId: v.union(v.id("players"), v.id("companies")),
    fromAccountType: v.union(v.literal("player"), v.literal("company")),
    toAccountId: v.union(v.id("players"), v.id("companies")),
    toAccountType: v.union(v.literal("player"), v.literal("company")),
    amount: v.number(), // in cents
    assetType: v.union(
      v.literal("cash"),
      v.literal("stock"),
      v.literal("product")
    ),
    assetId: v.optional(v.string()), // id of stock/crypto/product if applicable
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_fromAccountId", ["fromAccountId"])
    .index("by_toAccountId", ["toAccountId"])
    .index("by_createdAt", ["createdAt"]),

  loans: defineTable({
    playerId: v.id("players"),
    amount: v.number(), // in cents, original amount
    interestRate: v.number(), // percentage, e.g., 5 for 5%
    remainingBalance: v.number(), // in cents
    accruedInterest: v.number(), // in cents
    createdAt: v.number(),
    dueDate: v.optional(v.number()),
    lastInterestApplied: v.number(),
    status: v.union(v.literal("active"), v.literal("paid"), v.literal("defaulted")),
  })
    .index("by_playerId", ["playerId"])
    .index("by_status", ["status"]),

  marketplaceListings: defineTable({
    productId: v.id("products"),
    sellerCompanyId: v.id("companies"),
    quantity: v.number(),
    listedPrice: v.number(), // in cents
    soldQuantity: v.number(),
    createdAt: v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_sellerCompanyId", ["sellerCompanyId"]),

  companyShares: defineTable({
    companyId: v.id("companies"),
    userId: v.id("players"),
    shares: v.number(),
    purchasePrice: v.number(), // in cents per share
    purchasedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_userId", ["userId"])
    .index("by_userId_companyId", ["userId", "companyId"]),

  marketplaceSales: defineTable({
    productId: v.id("products"),
    companyId: v.id("companies"),
    quantity: v.number(),
    purchaserId: v.union(v.id("players"), v.literal("bot")),
    purchaserType: v.union(v.literal("player"), v.literal("bot")),
    totalPrice: v.number(), // in cents
    createdAt: v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_companyId", ["companyId"])
    .index("by_purchaserId", ["purchaserId"])
    .index("by_createdAt", ["createdAt"]),

  companySales: defineTable({
    companyId: v.id("companies"),
    sellerId: v.id("players"), // current owner listing company
    buyerId: v.optional(v.id("players")), // player making offer
    askingPrice: v.number(), // in cents, seller's asking price
    offeredPrice: v.optional(v.number()), // in cents, buyer's offer
    counterOfferPrice: v.optional(v.number()), // in cents
    status: v.union(
      v.literal("listed"),
      v.literal("offer_pending"),
      v.literal("counter_offer"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_sellerId", ["sellerId"])
    .index("by_buyerId", ["buyerId"])
    .index("by_status", ["status"]),

  tickHistory: defineTable({
    tickNumber: v.number(),
    timestamp: v.number(),
    botPurchases: v.array(
      v.object({
        productId: v.id("products"),
        companyId: v.id("companies"),
        quantity: v.number(),
        totalPrice: v.number(),
      })
    ),
    stockPriceUpdates: v.optional(
      v.array(
        v.object({
          stockId: v.id("stocks"),
          oldPrice: v.number(),
          newPrice: v.number(),
        })
      )
    ),
    cryptoPriceUpdates: v.optional(
      v.array(
        v.object({
          cryptoId: v.id("cryptocurrencies"),
          oldPrice: v.number(),
          newPrice: v.number(),
        })
      )
    ),
    totalBudgetSpent: v.number(), // in cents
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_tickNumber", ["tickNumber"]),

  stockPriceHistory: defineTable({
    stockId: v.id("stocks"),
    price: v.number(), // in cents
    timestamp: v.number(),
    open: v.optional(v.number()), // for candlestick
    high: v.optional(v.number()),
    low: v.optional(v.number()),
    close: v.optional(v.number()),
    volume: v.optional(v.number()),
  })
    .index("by_stockId", ["stockId"])
    .index("by_stockId_timestamp", ["stockId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  stockTrades: defineTable({
    stockId: v.id("stocks"),
    companyId: v.id("companies"),
    shares: v.number(),
    pricePerShare: v.number(), // in cents
    totalValue: v.number(), // in cents
    tradeType: v.union(v.literal("buy"), v.literal("sell")),
    timestamp: v.number(),
  })
    .index("by_stockId", ["stockId"])
    .index("by_stockId_timestamp", ["stockId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Upgrades system
  upgrades: defineTable({
    playerId: v.id("players"),
    upgradeType: v.string(), // e.g., "interest_boost", "stock_returns_boost"
    name: v.string(),
    description: v.string(),
    cost: v.number(), // in cents
    benefit: v.string(), // e.g., "+10% Daily Interest Rate"
    isActive: v.boolean(),
    purchasedAt: v.number(),
  })
    .index("by_playerId", ["playerId"])
    .index("by_upgradeType", ["upgradeType"]),

  // Gambling history
  gamblingHistory: defineTable({
    playerId: v.id("players"),
    gameType: v.union(
      v.literal("slots"),
      v.literal("blackjack"),
      v.literal("dice"),
      v.literal("roulette")
    ),
    betAmount: v.number(), // in cents
    payout: v.number(), // in cents
    result: v.union(v.literal("win"), v.literal("loss")),
    details: v.optional(v.any()), // game-specific details
    timestamp: v.number(),
  })
    .index("by_playerId", ["playerId"])
    .index("by_gameType", ["gameType"])
    .index("by_timestamp", ["timestamp"]),

  // Configuration table for game settings
  gameConfig: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  // Player marketplace inventory
  playerInventory: defineTable({
    playerId: v.id("players"),
    productId: v.id("products"),
    quantity: v.number(),
    purchasedAt: v.number(),
    totalPrice: v.number(), // total price paid for these items in cents
  })
    .index("by_playerId", ["playerId"])
    .index("by_productId", ["productId"])
    .index("by_playerId_productId", ["playerId", "productId"]),

  subscriptions: defineTable({
    userId: v.optional(v.string()),
    polarId: v.optional(v.string()),
    polarPriceId: v.optional(v.string()),
    currency: v.optional(v.string()),
    interval: v.optional(v.string()),
    status: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    amount: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    customerCancellationReason: v.optional(v.string()),
    customerCancellationComment: v.optional(v.string()),
    metadata: v.optional(v.any()),
    customFieldData: v.optional(v.any()),
    customerId: v.optional(v.string()),
  })
    .index("userId", ["userId"])
    .index("polarId", ["polarId"]),
  webhookEvents: defineTable({
    type: v.string(),
    polarEventId: v.string(),
    createdAt: v.string(),
    modifiedAt: v.string(),
    data: v.any(),
  })
    .index("type", ["type"])
    .index("polarEventId", ["polarEventId"]),

  globalAlerts: defineTable({
    createdBy: v.id("players"), // admin who created it
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("success"), v.literal("error")), // alert type/color
    readBy: v.optional(v.array(v.id("players"))), // players who have seen it (starts empty)
    sentAt: v.number(), // timestamp when sent
    createdAt: v.number(),
  })
    .index("by_sentAt", ["sentAt"]),

  // Active blackjack games
  blackjackGames: defineTable({
    playerId: v.id("players"),
    betAmount: v.number(), // in cents
    playerHand: v.array(v.number()),
    dealerHand: v.array(v.number()),
    deck: v.array(v.number()),
    gameState: v.union(
      v.literal("playing"),
      v.literal("player_bust"),
      v.literal("dealer_bust"),
      v.literal("player_win"),
      v.literal("dealer_win"),
      v.literal("push"),
      v.literal("blackjack")
    ),
    playerStood: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_playerId", ["playerId"])
    .index("by_playerId_updatedAt", ["playerId", "updatedAt"]),

  // Cryptocurrency system
  cryptocurrencies: defineTable({
    name: v.string(), // e.g., "GameCoin"
    symbol: v.string(), // e.g., "GMC"
    totalSupply: v.number(),
    circulatingSupply: v.number(),
    currentPrice: v.number(), // in cents
    marketCap: v.number(), // in cents
    liquidity: v.number(), // simulated pool for price impact
    baseVolatility: v.number(), // daily volatility factor (0.05-0.2)
    trendDrift: v.number(), // current trend direction (-0.01 to 0.01)
    lastVolatilityUpdate: v.number(), // for volatility clustering
    lastPriceChange: v.number(), // for momentum calculation
    createdAt: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_symbol", ["symbol"]),

  cryptoPriceHistory: defineTable({
    cryptoId: v.id("cryptocurrencies"),
    timestamp: v.number(),
    open: v.number(), // in cents
    high: v.number(), // in cents
    low: v.number(), // in cents
    close: v.number(), // in cents
    volume: v.number(), // aggregated trades in interval
  })
    .index("by_crypto_time", ["cryptoId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  playerCryptoWallets: defineTable({
    playerId: v.id("players"),
    cryptoId: v.id("cryptocurrencies"),
    balance: v.number(), // amount of coins owned
    totalInvested: v.number(), // in cents, total money spent
    averagePurchasePrice: v.number(), // in cents per coin
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_player_crypto", ["playerId", "cryptoId"])
    .index("by_playerId", ["playerId"])
    .index("by_cryptoId", ["cryptoId"]),

  cryptoTransactions: defineTable({
    playerId: v.id("players"),
    cryptoId: v.id("cryptocurrencies"),
    type: v.union(v.literal("buy"), v.literal("sell")),
    amount: v.number(), // coins
    pricePerCoin: v.number(), // in cents
    totalValue: v.number(), // in cents
    priceImpact: v.number(), // percentage
    timestamp: v.number(),
  })
    .index("by_playerId", ["playerId"])
    .index("by_cryptoId", ["cryptoId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_player_crypto_time", ["playerId", "cryptoId", "timestamp"]),
});
