import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Cryptocurrency Operations", () => {
  let t: any;
  let userId: any;
  let playerId: any;
  let cryptoId: any;

  beforeEach(async () => {
    t = convexTest(schema);
    
    // Create test user and player
    userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-123",
        name: "Test User",
      });
    });
    
    playerId = await t.mutation(api.players.createPlayer, { userId });
  });

  it("should create a cryptocurrency", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "TestCoin",
      ticker: "TST",
      description: "A test cryptocurrency",
      initialSupply: 1000000, // 1M tokens
      maxSupply: 10000000, // 10M tokens max
    });
    
    const crypto = await t.query(api.crypto.getCryptocurrency, { cryptoId });
    
    expect(crypto).toBeDefined();
    expect(crypto.name).toBe("TestCoin");
    expect(crypto.ticker).toBe("TST");
    expect(crypto.creatorPlayerId).toBe(playerId);
    expect(crypto.circulatingSupply).toBe(1000000);
    expect(crypto.maxSupply).toBe(10000000);
    expect(crypto.price).toBe(100); // $1 initial price
    
    // Creator should have all initial tokens
    const holdings = await t.query(api.crypto.getPlayerCryptoHoldings, {
      playerId,
    });
    
    expect(holdings.length).toBe(1);
    expect(holdings[0].quantity).toBe(1000000);
    
    // Player should be charged $10k creation fee
    const player = await t.query(api.players.getPlayer, { playerId });
    expect(player.balance).toBe(1000000 - 1000000); // $10k - $10k fee = 0
  });

  it("should fail to create crypto if player has insufficient balance", async () => {
    // Player only has $10k starting balance
    // Try to create two cryptos (would need $20k)
    await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "FirstCoin",
      ticker: "FST",
      initialSupply: 1000000,
    });
    
    await expect(
      t.mutation(api.crypto.createCryptocurrency, {
        playerId,
        name: "SecondCoin",
        ticker: "SND",
        initialSupply: 1000000,
      })
    ).rejects.toThrow("Insufficient balance");
  });

  it("should not allow duplicate ticker symbols", async () => {
    await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "FirstCoin",
      ticker: "DUP",
      initialSupply: 1000000,
    });
    
    await expect(
      t.mutation(api.crypto.createCryptocurrency, {
        playerId,
        name: "SecondCoin",
        ticker: "DUP",
        initialSupply: 1000000,
      })
    ).rejects.toThrow("already exists");
  });

  it("should allow player to buy cryptocurrency", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "BuyCoin",
      ticker: "BUY",
      initialSupply: 1000000,
    });
    
    // Create another player to buy from
    const user2Id = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-456",
        name: "Test User 2",
      });
    });
    
    const player2Id = await t.mutation(api.players.createPlayer, { userId: user2Id });
    
    // Give player2 money
    await t.mutation(api.players.updatePlayerBalance, {
      playerId: player2Id,
      amount: 100000, // $1k
    });
    
    const holdingId = await t.mutation(api.crypto.buyCryptocurrency, {
      accountId: player2Id,
      accountType: "player",
      cryptoId,
      quantity: 1000,
      pricePerToken: 100,
    });
    
    const holding = await t.run(async (ctx: any) => {
      return await ctx.db.get(holdingId);
    });
    
    expect(holding.playerId).toBe(player2Id);
    expect(holding.quantity).toBe(1000);
    expect(holding.averagePurchasePrice).toBe(100);
  });

  it("should calculate weighted average purchase price for crypto", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "AvgCoin",
      ticker: "AVG",
      initialSupply: 1000000,
    });
    
    const user2Id = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-456",
        name: "Test User 2",
      });
    });
    
    const player2Id = await t.mutation(api.players.createPlayer, { userId: user2Id });
    
    await t.mutation(api.players.updatePlayerBalance, {
      playerId: player2Id,
      amount: 500000, // $5k
    });
    
    // First purchase: 1000 tokens @ $1
    const holdingId = await t.mutation(api.crypto.buyCryptocurrency, {
      accountId: player2Id,
      accountType: "player",
      cryptoId,
      quantity: 1000,
      pricePerToken: 100,
    });
    
    // Second purchase: 1000 tokens @ $2
    await t.mutation(api.crypto.buyCryptocurrency, {
      accountId: player2Id,
      accountType: "player",
      cryptoId,
      quantity: 1000,
      pricePerToken: 200,
    });
    
    const holding = await t.run(async (ctx: any) => {
      return await ctx.db.get(holdingId);
    });
    
    // Average should be (1000×$1 + 1000×$2) / 2000 = $1.50
    expect(holding.averagePurchasePrice).toBe(150);
    expect(holding.quantity).toBe(2000);
  });

  it("should allow player to sell cryptocurrency", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "SellCoin",
      ticker: "SELL",
      initialSupply: 1000000,
    });
    
    const initialBalance = (await t.query(api.players.getPlayer, { playerId })).balance;
    
    // Sell 10,000 tokens @ $2
    await t.mutation(api.crypto.sellCryptocurrency, {
      accountId: playerId,
      accountType: "player",
      cryptoId,
      quantity: 10000,
      pricePerToken: 200,
    });
    
    const holdings = await t.query(api.crypto.getPlayerCryptoHoldings, {
      playerId,
    });
    
    expect(holdings[0].quantity).toBe(990000); // 1M - 10k sold
    
    // Check balance increased
    const player = await t.query(api.players.getPlayer, { playerId });
    expect(player.balance).toBe(initialBalance + 2000000); // +$20k from sale
  });

  it("should fail if trying to sell more than owned", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "FailCoin",
      ticker: "FAIL",
      initialSupply: 1000,
    });
    
    await expect(
      t.mutation(api.crypto.sellCryptocurrency, {
        accountId: playerId,
        accountType: "player",
        cryptoId,
        quantity: 2000, // More than owned
        pricePerToken: 100,
      })
    ).rejects.toThrow("Insufficient");
  });

  it("should update crypto price", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "PriceCoin",
      ticker: "PRC",
      initialSupply: 1000000,
    });
    
    await t.mutation(api.crypto.updateCryptoPrice, {
      cryptoId,
      newPrice: 250, // $2.50
    });
    
    const crypto = await t.query(api.crypto.getCryptocurrency, { cryptoId });
    expect(crypto.price).toBe(250);
    expect(crypto.previousPrice).toBe(100); // Old price saved
  });

  it("should get crypto by ticker", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "TickerCoin",
      ticker: "TICK",
      initialSupply: 1000000,
    });
    
    const crypto = await t.query(api.crypto.getCryptocurrencyByTicker, {
      ticker: "TICK",
    });
    
    expect(crypto).toBeDefined();
    expect(crypto._id).toBe(cryptoId);
  });

  it("should get all cryptocurrencies", async () => {
    const crypto1Id = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "Coin1",
      ticker: "CN1",
      initialSupply: 1000000,
    });
    
    // Give player more money for second crypto
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 1000000, // +$10k
    });
    
    const crypto2Id = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "Coin2",
      ticker: "CN2",
      initialSupply: 500000,
    });
    
    const allCryptos = await t.query(api.crypto.getAllCryptocurrencies, {});
    
    expect(allCryptos.length).toBe(2);
    expect(allCryptos.map((c: any) => c._id)).toContain(crypto1Id);
    expect(allCryptos.map((c: any) => c._id)).toContain(crypto2Id);
  });

  it("should get crypto holders", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "HolderCoin",
      ticker: "HOLD",
      initialSupply: 1000000,
    });
    
    const holders = await t.query(api.crypto.getCryptoHolders, { cryptoId });
    
    expect(holders.length).toBe(1);
    expect(holders[0].playerId).toBe(playerId);
    expect(holders[0].quantity).toBe(1000000);
  });

  it("should get top crypto holders", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "TopCoin",
      ticker: "TOP",
      initialSupply: 1000000,
    });
    
    // Create second player and transfer some tokens
    const user2Id = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-456",
        name: "Test User 2",
      });
    });
    
    const player2Id = await t.mutation(api.players.createPlayer, { userId: user2Id });
    
    await t.mutation(api.players.updatePlayerBalance, {
      playerId: player2Id,
      amount: 300000, // $3k
    });
    
    // Player2 buys some
    await t.mutation(api.crypto.buyCryptocurrency, {
      accountId: player2Id,
      accountType: "player",
      cryptoId,
      quantity: 300000,
      pricePerToken: 100,
    });
    
    const topHolders = await t.query(api.crypto.getTopCryptoHolders, {
      cryptoId,
      limit: 2,
    });
    
    expect(topHolders.length).toBe(2);
    expect(topHolders[0].playerId).toBe(playerId); // Largest holder first
    expect(topHolders[0].quantity).toBe(1000000);
  });

  it("should calculate market cap correctly", async () => {
    cryptoId = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "CapCoin",
      ticker: "CAP",
      initialSupply: 1000000,
    });
    
    // Update price to $5
    await t.mutation(api.crypto.updateCryptoPrice, {
      cryptoId,
      newPrice: 500,
    });
    
    const crypto = await t.query(api.crypto.getCryptocurrency, { cryptoId });
    
    // Market cap = circulating supply × price = 1M × $5 = $5M
    expect(crypto.marketCap).toBe(500000000); // $5M in cents
  });

  it("should get top cryptos by market cap", async () => {
    const crypto1Id = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "BigCoin",
      ticker: "BIG",
      initialSupply: 10000000, // 10M tokens
    });
    
    await t.mutation(api.players.updatePlayerBalance, {
      playerId,
      amount: 1000000,
    });
    
    const crypto2Id = await t.mutation(api.crypto.createCryptocurrency, {
      playerId,
      name: "SmallCoin",
      ticker: "SML",
      initialSupply: 100000, // 100k tokens
    });
    
    const topCryptos = await t.query(api.crypto.getTopCryptosByMarketCap, {
      limit: 2,
    });
    
    expect(topCryptos.length).toBe(2);
    expect(topCryptos[0]._id).toBe(crypto1Id); // Highest market cap first
  });
});
