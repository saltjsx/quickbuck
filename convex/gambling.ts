import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Helper to get or create player from token
async function findPlayerByToken(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Find or create the user record
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) =>
      q.eq("tokenIdentifier", identity.subject)
    )
    .unique();

  if (!user) {
    // Create new user if doesn't exist
    const userId = await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      tokenIdentifier: identity.subject,
    });
    user = await ctx.db.get(userId);
  }

  // Find or create the player record
  let player = await ctx.db
    .query("players")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .unique();

  if (!player) {
    // Create new player if doesn't exist
    const now = Date.now();
    const playerId = await ctx.db.insert("players", {
      userId: user._id,
      balance: 1000000, // $10,000 in cents
      netWorth: 1000000,
      createdAt: now,
      updatedAt: now,
    });
    player = await ctx.db.get(playerId);
  }

  return player;
}

// Slot Machine
export const playSlots = mutation({
  args: {
    betAmount: v.number(), // in cents
  },
  handler: async (ctx, args) => {
    const player = await findPlayerByToken(ctx);

    // EXPLOIT FIX: Validate bet amount is positive and safe integer
    if (args.betAmount <= 0) {
      throw new Error("Bet amount must be positive");
    }

    if (!Number.isSafeInteger(args.betAmount)) {
      throw new Error("Bet amount is not a safe integer");
    }

    // EXPLOIT FIX: Add maximum bet limit
    if (args.betAmount > 100000000) { // Max $1M bet
      throw new Error("Bet amount exceeds maximum of $1,000,000");
    }

    if (player.balance < args.betAmount) {
      throw new Error("Insufficient balance");
    }

    // Generate three random symbols (0-6: cherry, lemon, orange, plum, bell, bar, seven)
    const symbols = ["🍒", "🍋", "🍊", "💎", "🔔", "⭐", "7️⃣"];
    const reel1 = Math.floor(Math.random() * symbols.length);
    const reel2 = Math.floor(Math.random() * symbols.length);
    const reel3 = Math.floor(Math.random() * symbols.length);

    let multiplier = 0;
    let result: "win" | "loss" = "loss";

    // Check for matches
    if (reel1 === reel2 && reel2 === reel3) {
      // Three of a kind
      if (reel1 === 6) multiplier = 100; // Three sevens
      else if (reel1 === 5) multiplier = 50; // Three stars
      else if (reel1 === 4) multiplier = 25; // Three bells
      else if (reel1 === 3) multiplier = 15; // Three diamonds
      else multiplier = 10; // Three fruits
      result = "win";
    } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
      // Two of a kind
      multiplier = 2;
      result = "win";
    }

    const payout = args.betAmount * multiplier;
    const netChange = payout - args.betAmount;

    // Update player balance
    await ctx.db.patch(player._id, {
      balance: player.balance + netChange,
      updatedAt: Date.now(),
    });

    // Record gambling history
    await ctx.db.insert("gamblingHistory", {
      playerId: player._id,
      gameType: "slots",
      betAmount: args.betAmount,
      payout,
      result,
      details: {
        reels: [symbols[reel1], symbols[reel2], symbols[reel3]],
        multiplier,
      },
      timestamp: Date.now(),
    });

    return {
      reels: [symbols[reel1], symbols[reel2], symbols[reel3]],
      multiplier,
      payout,
      netChange,
      result,
      newBalance: player.balance + netChange,
    };
  },
});

// Blackjack
export const startBlackjack = mutation({
  args: {
    betAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const player = await findPlayerByToken(ctx);

    // EXPLOIT FIX: Validate bet amount
    if (args.betAmount <= 0) {
      throw new Error("Bet amount must be positive");
    }

    if (!Number.isSafeInteger(args.betAmount)) {
      throw new Error("Bet amount is not a safe integer");
    }

    if (args.betAmount > 100000000) { // Max $1M bet
      throw new Error("Bet amount exceeds maximum of $1,000,000");
    }

    if (player.balance < args.betAmount) {
      throw new Error("Insufficient balance");
    }

    // Deduct bet from balance
    await ctx.db.patch(player._id, {
      balance: player.balance - args.betAmount,
      updatedAt: Date.now(),
    });

    // Deal cards (simplified: just values 1-11)
    const drawCard = () => Math.min(Math.floor(Math.random() * 13) + 1, 10);
    
    const playerCards = [drawCard(), drawCard()];
    const dealerCards = [drawCard(), drawCard()];
    
    let playerTotal = playerCards.reduce((a, b) => a + b, 0);
    let dealerTotal = dealerCards.reduce((a, b) => a + b, 0);

    // Handle aces
    if (playerTotal > 21 && playerCards.includes(1)) {
      playerTotal -= 10;
    }

    return {
      playerCards,
      dealerCards: [dealerCards[0]], // Only show dealer's first card
      playerTotal,
      dealerFirstCard: dealerCards[0],
      gameId: `${player._id}_${Date.now()}`, // Simple game ID
      betAmount: args.betAmount,
    };
  },
});

export const blackjackAction = mutation({
  args: {
    action: v.union(v.literal("hit"), v.literal("stand"), v.literal("double")),
    playerCards: v.array(v.number()),
    dealerCards: v.array(v.number()),
    betAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const player = await findPlayerByToken(ctx);

    let playerCards = [...args.playerCards];
    let dealerCards = [...args.dealerCards];
    let betAmount = args.betAmount;

    const drawCard = () => Math.min(Math.floor(Math.random() * 13) + 1, 10);
    const calculateTotal = (cards: number[]) => {
      let total = cards.reduce((a, b) => a + b, 0);
      // Simple ace handling
      if (total > 21 && cards.includes(1)) {
        total -= 10;
      }
      return total;
    };

    // Handle player action
    if (args.action === "hit") {
      playerCards.push(drawCard());
    } else if (args.action === "double") {
      if (player.balance < betAmount) {
        throw new Error("Insufficient balance to double down");
      }
      await ctx.db.patch(player._id, {
        balance: player.balance - betAmount,
      });
      betAmount *= 2;
      playerCards.push(drawCard());
    }

    let playerTotal = calculateTotal(playerCards);

    // Check if player busted
    if (playerTotal > 21) {
      await ctx.db.insert("gamblingHistory", {
        playerId: player._id,
        gameType: "blackjack",
        betAmount,
        payout: 0,
        result: "loss",
        details: { playerCards, dealerCards, playerTotal, dealerTotal: 0 },
        timestamp: Date.now(),
      });

      return {
        playerCards,
        dealerCards,
        playerTotal,
        dealerTotal: calculateTotal(dealerCards),
        result: "loss",
        payout: 0,
        newBalance: player.balance,
        gameOver: true,
      };
    }

    // If player stands or doubles, dealer plays
    if (args.action === "stand" || args.action === "double") {
      // Dealer hits on 16, stands on 17+
      let dealerTotal = calculateTotal(dealerCards);
      while (dealerTotal < 17) {
        dealerCards.push(drawCard());
        dealerTotal = calculateTotal(dealerCards);
      }

      // Determine winner
      let result: "win" | "loss" = "loss";
      let payout = 0;

      if (dealerTotal > 21 || playerTotal > dealerTotal) {
        result = "win";
        payout = betAmount * 2; // Return bet + winnings
      } else if (playerTotal === dealerTotal) {
        result = "win"; // Push - return bet
        payout = betAmount;
      }

      // Update balance
      await ctx.db.patch(player._id, {
        balance: player.balance + payout,
        updatedAt: Date.now(),
      });

      // Record history
      await ctx.db.insert("gamblingHistory", {
        playerId: player._id,
        gameType: "blackjack",
        betAmount,
        payout,
        result,
        details: { playerCards, dealerCards, playerTotal, dealerTotal },
        timestamp: Date.now(),
      });

      return {
        playerCards,
        dealerCards,
        playerTotal,
        dealerTotal,
        result,
        payout,
        newBalance: player.balance + payout,
        gameOver: true,
      };
    }

    // Game continues (hit action)
    return {
      playerCards,
      dealerCards,
      playerTotal,
      dealerTotal: calculateTotal(dealerCards),
      result: null,
      payout: 0,
      newBalance: player.balance,
      gameOver: false,
    };
  },
});

// Dice Roll
export const playDice = mutation({
  args: {
    betAmount: v.number(),
    betType: v.union(
      v.literal("odd"),
      v.literal("even"),
      v.literal("under7"),
      v.literal("over7"),
      v.literal("exact7")
    ),
  },
  handler: async (ctx, args) => {
    const player = await findPlayerByToken(ctx);

    // EXPLOIT FIX: Validate bet amount
    if (args.betAmount <= 0) {
      throw new Error("Bet amount must be positive");
    }

    if (!Number.isSafeInteger(args.betAmount)) {
      throw new Error("Bet amount is not a safe integer");
    }

    if (args.betAmount > 100000000) { // Max $1M bet
      throw new Error("Bet amount exceeds maximum of $1,000,000");
    }

    if (player.balance < args.betAmount) {
      throw new Error("Insufficient balance");
    }

    // Roll two dice
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;

    let won = false;
    let multiplier = 0;

    switch (args.betType) {
      case "odd":
        won = total % 2 === 1;
        multiplier = 2;
        break;
      case "even":
        won = total % 2 === 0;
        multiplier = 2;
        break;
      case "under7":
        won = total < 7;
        multiplier = 2;
        break;
      case "over7":
        won = total > 7;
        multiplier = 2;
        break;
      case "exact7":
        won = total === 7;
        multiplier = 5;
        break;
    }

    const result = won ? "win" : "loss";
    const payout = won ? args.betAmount * multiplier : 0;
    const netChange = payout - args.betAmount;

    // Update balance
    await ctx.db.patch(player._id, {
      balance: player.balance + netChange,
      updatedAt: Date.now(),
    });

    // Record history
    await ctx.db.insert("gamblingHistory", {
      playerId: player._id,
      gameType: "dice",
      betAmount: args.betAmount,
      payout,
      result,
      details: { die1, die2, total, betType: args.betType, multiplier },
      timestamp: Date.now(),
    });

    return {
      die1,
      die2,
      total,
      result,
      payout,
      netChange,
      multiplier,
      newBalance: player.balance + netChange,
    };
  },
});

// Roulette
export const playRoulette = mutation({
  args: {
    betAmount: v.number(),
    betType: v.union(
      v.literal("red"),
      v.literal("black"),
      v.literal("odd"),
      v.literal("even"),
      v.literal("low"), // 1-18
      v.literal("high"), // 19-36
      v.literal("green") // 0
    ),
    specificNumber: v.optional(v.number()), // For betting on specific numbers
  },
  handler: async (ctx, args) => {
    const player = await findPlayerByToken(ctx);

    // EXPLOIT FIX: Validate bet amount
    if (args.betAmount <= 0) {
      throw new Error("Bet amount must be positive");
    }

    if (!Number.isSafeInteger(args.betAmount)) {
      throw new Error("Bet amount is not a safe integer");
    }

    if (args.betAmount > 100000000) { // Max $1M bet
      throw new Error("Bet amount exceeds maximum of $1,000,000");
    }

    if (player.balance < args.betAmount) {
      throw new Error("Insufficient balance");
    }

    // Spin the wheel (0-36)
    const number = Math.floor(Math.random() * 37);
    
    // Correct American Roulette red and black numbers
    // Red: 1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
    // Black: 2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
    
    // Determine properties of the spun number
    const isGreen = number === 0;
    const isRed = redNumbers.includes(number);
    const isBlack = blackNumbers.includes(number);
    const isOdd = number > 0 && number % 2 === 1;
    const isEven = number > 0 && number % 2 === 0;
    const isLow = number >= 1 && number <= 18;
    const isHigh = number >= 19 && number <= 36;

    let won = false;
    let multiplier = 0;

    // Check if bet wins
    if (args.specificNumber !== undefined) {
      won = number === args.specificNumber;
      multiplier = 36;
    } else {
      switch (args.betType) {
        case "red":
          won = isRed;
          multiplier = 2;
          break;
        case "black":
          won = isBlack;
          multiplier = 2;
          break;
        case "odd":
          won = isOdd;
          multiplier = 2;
          break;
        case "even":
          won = isEven;
          multiplier = 2;
          break;
        case "low":
          won = isLow;
          multiplier = 2;
          break;
        case "high":
          won = isHigh;
          multiplier = 2;
          break;
        case "green":
          won = isGreen;
          multiplier = 36;
          break;
      }
    }

    const result = won ? "win" : "loss";
    const payout = won ? args.betAmount * multiplier : 0;
    const netChange = payout - args.betAmount;

    // Update balance
    await ctx.db.patch(player._id, {
      balance: player.balance + netChange,
      updatedAt: Date.now(),
    });

    // Record history
    await ctx.db.insert("gamblingHistory", {
      playerId: player._id,
      gameType: "roulette",
      betAmount: args.betAmount,
      payout,
      result,
      details: {
        number,
        color: isGreen ? "green" : isRed ? "red" : "black",
        betType: args.betType,
        specificNumber: args.specificNumber,
        multiplier,
        isRed,
        isBlack,
        isOdd,
        isEven,
      },
      timestamp: Date.now(),
    });

    return {
      number,
      color: isGreen ? "green" : isRed ? "red" : "black",
      result,
      payout,
      netChange,
      multiplier,
      newBalance: player.balance + netChange,
      isRed,
      isBlack,
      isOdd,
      isEven,
    };
  },
});

// Query gambling history
export const getGamblingHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const player = await findPlayerByToken(ctx);

    const history = await ctx.db
      .query("gamblingHistory")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .order("desc")
      .take(args.limit || 50);

    return history;
  },
});

// Get gambling stats
export const getGamblingStats = query({
  handler: async (ctx) => {
    const player = await findPlayerByToken(ctx);

    const history = await ctx.db
      .query("gamblingHistory")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .collect();

    const totalBets = history.length;
    const totalWagered = history.reduce((sum, h) => sum + h.betAmount, 0);
    const totalPayout = history.reduce((sum, h) => sum + h.payout, 0);
    const netProfit = totalPayout - totalWagered;
    const wins = history.filter((h) => h.result === "win").length;
    const losses = history.filter((h) => h.result === "loss").length;
    const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;

    return {
      totalBets,
      totalWagered,
      totalPayout,
      netProfit,
      wins,
      losses,
      winRate,
    };
  },
});
