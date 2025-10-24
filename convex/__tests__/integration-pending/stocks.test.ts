import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Stock Market Operations", () => {
  let t: any;
  let userId: any;
  let playerId: any;
  let companyId: any;
  let stockId: any;

  beforeEach(async () => {
    t = convexTest(schema);
    
    // Create test user, player, and company
    userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-123",
        name: "Test User",
      });
    });
    
    playerId = await t.mutation(api.players.createPlayer, { userId });
    
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Public Company",
    });
    
    // Give company money for IPO
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId,
      amount: 5000000, // $50k
    });
    
    // Make company public
    stockId = await t.mutation(api.companies.makeCompanyPublic, {
      companyId,
      ticker: "TEST",
      totalShares: 100000,
    });
  });

  it("should allow player to buy stock", async () => {
    // Give player money
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 100000, // $1,000
    });
    
    const holdingId = await t.mutation(api.stocks.buyStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 10,
      pricePerShare: 1000,
    });
    
    const holding = await t.run(async (ctx: any) => {
      return await ctx.db.get(holdingId);
    });
    
    expect(holding).toBeDefined();
    expect(holding.playerId).toBe(playerId);
    expect(holding.quantity).toBe(10);
    expect(holding.averagePurchasePrice).toBe(1000);
    
    // Check player balance was deducted
    const player = await t.query(api.players.getPlayer, { playerId });
    expect(player.balance).toBe(1100000); // 1M + 100k - 10k spent
  });

  it("should calculate weighted average purchase price", async () => {
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 200000, // $2,000
    });
    
    // First purchase: 10 shares @ $10
    const holdingId = await t.mutation(api.stocks.buyStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 10,
      pricePerShare: 1000,
    });
    
    let holding = await t.run(async (ctx: any) => {
      return await ctx.db.get(holdingId);
    });
    expect(holding.averagePurchasePrice).toBe(1000);
    
    // Second purchase: 10 shares @ $20
    await t.mutation(api.stocks.buyStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 10,
      pricePerShare: 2000,
    });
    
    holding = await t.run(async (ctx: any) => {
      return await ctx.db.get(holdingId);
    });
    
    // Average should be (10×$10 + 10×$20) / 20 = $15
    expect(holding.averagePurchasePrice).toBe(1500);
    expect(holding.quantity).toBe(20);
  });

  it("should allow player to sell stock", async () => {
    // Give player money and buy stock
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 100000,
    });
    
    await t.mutation(api.stocks.buyStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 10,
      pricePerShare: 1000,
    });
    
    const initialBalance = (await t.query(api.players.getPlayer, { playerId })).balance;
    
    // Sell 5 shares @ $12
    await t.mutation(api.stocks.sellStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 5,
      pricePerShare: 1200,
    });
    
    const holdings = await t.query(api.stocks.getPlayerStockHoldings, {
      playerId,
    });
    
    expect(holdings[0].quantity).toBe(5); // 10 - 5 sold
    
    // Check balance increased by sale proceeds
    const player = await t.query(api.players.getPlayer, { playerId });
    expect(player.balance).toBe(initialBalance + 6000); // +$60 from sale
  });

  it("should fail if trying to sell more than owned", async () => {
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 100000,
    });
    
    await t.mutation(api.stocks.buyStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 10,
      pricePerShare: 1000,
    });
    
    await expect(
      t.mutation(api.stocks.sellStock, {
        accountId: playerId,
        accountType: "player",
        stockId,
        quantity: 20, // More than owned
        pricePerShare: 1000,
      })
    ).rejects.toThrow("Insufficient shares");
  });

  it("should update stock price", async () => {
    await t.mutation(api.stocks.updateStockPrice, {
      stockId,
      newPrice: 1500, // $15
    });
    
    const stock = await t.query(api.stocks.getStock, { stockId });
    expect(stock.price).toBe(1500);
    expect(stock.previousPrice).toBe(1000); // Old price saved
  });

  it("should get stock by ticker", async () => {
    const stock = await t.query(api.stocks.getStockByTicker, {
      ticker: "TEST",
    });
    
    expect(stock).toBeDefined();
    expect(stock._id).toBe(stockId);
    expect(stock.ticker).toBe("TEST");
  });

  it("should get company stock info", async () => {
    const stock = await t.query(api.stocks.getCompanyStockInfo, {
      companyId,
    });
    
    expect(stock).toBeDefined();
    expect(stock._id).toBe(stockId);
  });

  it("should get all stocks", async () => {
    const stocks = await t.query(api.stocks.getAllStocks, {});
    
    expect(stocks.length).toBe(1);
    expect(stocks[0]._id).toBe(stockId);
  });

  it("should get player stock holdings", async () => {
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 100000,
    });
    
    await t.mutation(api.stocks.buyStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 10,
      pricePerShare: 1000,
    });
    
    const holdings = await t.query(api.stocks.getPlayerStockHoldings, {
      playerId,
    });
    
    expect(holdings.length).toBe(1);
    expect(holdings[0].stockId).toBe(stockId);
    expect(holdings[0].quantity).toBe(10);
  });

  it("should get stock holders", async () => {
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 100000,
    });
    
    await t.mutation(api.stocks.buyStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 10,
      pricePerShare: 1000,
    });
    
    const holders = await t.query(api.stocks.getStockHolders, { stockId });
    
    expect(holders.length).toBe(1);
    expect(holders[0].playerId).toBe(playerId);
    expect(holders[0].quantity).toBe(10);
  });

  it("should get top stock holders", async () => {
    // Create another player
    const user2Id = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-456",
        name: "Test User 2",
      });
    });
    
    const player2Id = await t.mutation(api.players.createPlayer, { userId: user2Id });
    
    // Both players buy stock
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 500000, // $5k
    });
    
    await t.mutation(api.players.updatePlayerBalance, {
      playerId: player2Id,
      amount: 300000, // $3k
    });
    
    await t.mutation(api.stocks.buyStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 50,
      pricePerShare: 1000,
    });
    
    await t.mutation(api.stocks.buyStock, {
      accountId: player2Id,
      accountType: "player",
      stockId,
      quantity: 30,
      pricePerShare: 1000,
    });
    
    const topHolders = await t.query(api.stocks.getTopStockHolders, {
      stockId,
      limit: 2,
    });
    
    expect(topHolders.length).toBe(2);
    expect(topHolders[0].playerId).toBe(playerId); // Largest holder first
    expect(topHolders[0].quantity).toBe(50);
    expect(topHolders[1].quantity).toBe(30);
  });

  it("should allow company to buy back stock", async () => {
    // Player buys stock first
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 100000,
    });
    
    await t.mutation(api.stocks.buyStock, {
      accountId: playerId,
      accountType: "player",
      stockId,
      quantity: 10,
      pricePerShare: 1000,
    });
    
    // Company buys it back
    const holdingId = await t.mutation(api.stocks.buyStock, {
      accountId: companyId,
      accountType: "company",
      stockId,
      quantity: 5,
      pricePerShare: 1200,
    });
    
    const holding = await t.run(async (ctx: any) => {
      return await ctx.db.get(holdingId);
    });
    
    expect(holding.companyId).toBe(companyId);
    expect(holding.quantity).toBe(5);
  });
});
