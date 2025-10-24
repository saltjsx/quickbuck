import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Company Operations", () => {
  let t: any;
  let userId: any;
  let playerId: any;
  let companyId: any;

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

  it("should create a new company", async () => {
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Test Company",
      description: "A test company",
    });
    
    const company = await t.query(api.companies.getCompany, { companyId });
    
    expect(company).toBeDefined();
    expect(company.name).toBe("Test Company");
    expect(company.ownerId).toBe(playerId);
    expect(company.balance).toBe(0);
    expect(company.isPublic).toBe(false);
    expect(company.reputationScore).toBe(0.5);
  });

  it("should update company balance", async () => {
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Test Company",
    });
    
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId,
      amount: 10000, // +$100
    });
    
    const company = await t.query(api.companies.getCompany, { companyId });
    expect(company.balance).toBe(10000);
  });

  it("should get player's companies", async () => {
    const company1Id = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Company 1",
    });
    
    const company2Id = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Company 2",
    });
    
    const companies = await t.query(api.companies.getPlayerCompanies, { playerId });
    
    expect(companies.length).toBe(2);
    expect(companies.map((c: any) => c._id)).toContain(company1Id);
    expect(companies.map((c: any) => c._id)).toContain(company2Id);
  });

  it("should make company public (IPO) when balance >= $50k", async () => {
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "IPO Company",
    });
    
    // Add enough balance for IPO
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId,
      amount: 5000000, // $50,000
    });
    
    const stockId = await t.mutation(api.companies.makeCompanyPublic, {
      companyId,
      ticker: "IPO",
      totalShares: 100000,
    });
    
    const company = await t.query(api.companies.getCompany, { companyId });
    const stock = await t.query(api.stocks.getStock, { stockId });
    
    expect(company.isPublic).toBe(true);
    expect(company.ticker).toBe("IPO");
    expect(company.marketCap).toBe(100000000); // $1M market cap
    expect(stock.ticker).toBe("IPO");
    expect(stock.price).toBe(1000);
    expect(stock.totalShares).toBe(100000);
  });

  it("should fail IPO if balance < $50k", async () => {
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Poor Company",
    });
    
    // Only add $1,000
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId,
      amount: 100000,
    });
    
    await expect(
      t.mutation(api.companies.makeCompanyPublic, {
        companyId,
        ticker: "POOR",
        totalShares: 100000,
      })
    ).rejects.toThrow("must be at least $50,000");
  });

  it("should not allow duplicate ticker symbols", async () => {
    // Create and IPO first company
    const company1Id = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Company 1",
    });
    
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId: company1Id,
      amount: 5000000,
    });
    
    await t.mutation(api.companies.makeCompanyPublic, {
      companyId: company1Id,
      ticker: "TEST",
      totalShares: 100000,
    });
    
    // Try to IPO second company with same ticker
    const company2Id = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Company 2",
    });
    
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId: company2Id,
      amount: 5000000,
    });
    
    await expect(
      t.mutation(api.companies.makeCompanyPublic, {
        companyId: company2Id,
        ticker: "TEST",
        totalShares: 100000,
      })
    ).rejects.toThrow("already in use");
  });

  it("should get all public companies", async () => {
    // Create and IPO a company
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Public Co",
    });
    
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId,
      amount: 5000000,
    });
    
    await t.mutation(api.companies.makeCompanyPublic, {
      companyId,
      ticker: "PUB",
      totalShares: 100000,
    });
    
    const publicCompanies = await t.query(api.companies.getAllPublicCompanies, {});
    
    expect(publicCompanies.length).toBe(1);
    expect(publicCompanies[0]._id).toBe(companyId);
    expect(publicCompanies[0].isPublic).toBe(true);
  });

  it("should get company by ticker", async () => {
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Ticker Test",
    });
    
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId,
      amount: 5000000,
    });
    
    await t.mutation(api.companies.makeCompanyPublic, {
      companyId,
      ticker: "TICK",
      totalShares: 100000,
    });
    
    const company = await t.query(api.companies.getCompanyByTicker, {
      ticker: "TICK",
    });
    
    expect(company).toBeDefined();
    expect(company._id).toBe(companyId);
  });

  it("should calculate player ownership correctly", async () => {
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Owned Company",
    });
    
    // Owner should have 100% of private company
    const ownership = await t.query(api.companies.getPlayerCompanyOwnership, {
      playerId,
      companyId,
    });
    
    expect(ownership).toBe(100);
  });

  it("should get top companies by balance", async () => {
    const company1Id = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Rich Company",
    });
    
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId: company1Id,
      amount: 10000000, // $100k
    });
    
    const company2Id = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Poor Company",
    });
    
    await t.mutation(api.companies.updateCompanyBalance, {
      companyId: company2Id,
      amount: 1000000, // $10k
    });
    
    const topCompanies = await t.query(api.companies.getTopCompaniesByBalance, {
      limit: 2,
    });
    
    expect(topCompanies.length).toBe(2);
    expect(topCompanies[0]._id).toBe(company1Id); // Richest first
    expect(topCompanies[1]._id).toBe(company2Id);
  });
});
