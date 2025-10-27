import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Mutation: Create loan
export const createLoan = mutation({
  args: {
    playerId: v.id("players"),
    amount: v.number(), // in cents
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0 || args.amount > 500000000) { // Max $5,000,000
      throw new Error("Loan amount must be between $0 and $5,000,000");
    }

    // EXPLOIT FIX: Check if amount would cause overflow
    if (!Number.isSafeInteger(args.amount)) {
      throw new Error("Loan amount is not a safe integer");
    }

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // EXPLOIT FIX: Check total outstanding debt to prevent excessive loans
    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    const totalOutstandingDebt = activeLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    
    if (totalOutstandingDebt + args.amount > 500000000) {
      throw new Error("Total outstanding debt would exceed maximum loan limit of $5,000,000");
    }

    const now = Date.now();
    const interestRate = 5; // 5% daily interest

    // Create loan
    const loanId = await ctx.db.insert("loans", {
      playerId: args.playerId,
      amount: args.amount,
      interestRate,
      remainingBalance: args.amount,
      accruedInterest: 0,
      createdAt: now,
      lastInterestApplied: now,
      status: "active" as const,
    });

    // Credit player's account
    await ctx.db.patch(args.playerId, {
      balance: player.balance + args.amount,
      updatedAt: now,
    });

    // Create transaction record
    await ctx.db.insert("transactions", {
      fromAccountId: args.playerId, // System/bank
      fromAccountType: "player" as const,
      toAccountId: args.playerId,
      toAccountType: "player" as const,
      amount: args.amount,
      assetType: "cash" as const,
      description: `Loan received: $${(args.amount / 100).toFixed(2)}`,
      createdAt: now,
    });

    return loanId;
  },
});

// Mutation: Repay loan
export const repayLoan = mutation({
  args: {
    loanId: v.id("loans"),
    amount: v.number(), // in cents
  },
  handler: async (ctx, args) => {
    // EXPLOIT FIX: Prevent negative repayment amounts
    if (args.amount <= 0) {
      throw new Error("Repayment amount must be positive");
    }

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new Error("Loan not found");
    }

    if (loan.status !== "active") {
      throw new Error("Loan is not active");
    }

    const player = await ctx.db.get(loan.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    if (player.balance < args.amount) {
      throw new Error("Insufficient balance to repay loan");
    }

    const paymentAmount = Math.min(args.amount, loan.remainingBalance);

    // Deduct from player's balance
    await ctx.db.patch(loan.playerId, {
      balance: player.balance - paymentAmount,
      updatedAt: Date.now(),
    });

    // Update loan
    const newBalance = loan.remainingBalance - paymentAmount;
    if (newBalance <= 0) {
      await ctx.db.patch(args.loanId, {
        remainingBalance: 0,
        status: "paid" as const,
      });
    } else {
      await ctx.db.patch(args.loanId, {
        remainingBalance: newBalance,
      });
    }

    // Create transaction record
    await ctx.db.insert("transactions", {
      fromAccountId: loan.playerId,
      fromAccountType: "player" as const,
      toAccountId: loan.playerId, // System/bank
      toAccountType: "player" as const,
      amount: paymentAmount,
      assetType: "cash" as const,
      description: `Loan repayment: $${(paymentAmount / 100).toFixed(2)}`,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});

// Mutation: Apply daily interest to all active loans
export const applyLoanInterest = mutation({
  handler: async (ctx) => {
    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const loan of activeLoans) {
      const daysSinceLastInterest = (now - loan.lastInterestApplied) / oneDayMs;

      if (daysSinceLastInterest >= 1) {
        // EXPLOIT FIX: Cap days to prevent interest overflow (max 365 days)
        const cappedDays = Math.min(Math.floor(daysSinceLastInterest), 365);
        
        const interestAmount = Math.floor(
          loan.remainingBalance * (loan.interestRate / 100) * cappedDays
        );

        const newBalance = loan.remainingBalance + interestAmount;
        const newAccruedInterest = loan.accruedInterest + interestAmount;

        // EXPLOIT FIX: Validate calculations don't overflow
        if (!Number.isSafeInteger(newBalance) || !Number.isSafeInteger(newAccruedInterest)) {
          console.error(`Interest calculation overflow for loan ${loan._id}`);
          continue; // Skip this loan to prevent corruption
        }

        await ctx.db.patch(loan._id, {
          remainingBalance: newBalance,
          accruedInterest: newAccruedInterest,
          lastInterestApplied: now,
        });

        // Deduct from player balance if possible
        const player = await ctx.db.get(loan.playerId);
        if (player) {
          // Allow negative balance for loan interest
          await ctx.db.patch(loan.playerId, {
            balance: player.balance - interestAmount,
            updatedAt: now,
          });

          // Create transaction record
          await ctx.db.insert("transactions", {
            fromAccountId: loan.playerId,
            fromAccountType: "player" as const,
            toAccountId: loan.playerId, // System/bank
            toAccountType: "player" as const,
            amount: interestAmount,
            assetType: "cash" as const,
            description: `Loan interest: $${(interestAmount / 100).toFixed(2)}`,
            createdAt: now,
          });
        }
      }
    }

    return activeLoans.length;
  },
});

// Query: Get loan
export const getLoan = query({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.loanId);
  },
});

// Query: Get player's loans
export const getPlayerLoans = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();
  },
});

// Query: Get player's active loans
export const getPlayerActiveLoans = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    return loans.filter((loan) => loan.status === "active");
  },
});

// Query: Get total loan debt for player
export const getPlayerTotalDebt = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    return activeLoans
      .filter((loan) => loan.status === "active")
      .reduce((total, loan) => total + loan.remainingBalance, 0);
  },
});
