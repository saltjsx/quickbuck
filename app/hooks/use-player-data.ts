"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useEffect } from "react";

export function usePlayerData(clerkUserId: string | null) {
  // Auto-initialize player on first access
  const getOrCreatePlayer = useMutation(api.players.getOrCreatePlayer);
  
  // First, get the Convex user ID by looking up the token identifier
  const user = useQuery(
    api.users.findUserByToken,
    clerkUserId ? { tokenIdentifier: clerkUserId } : "skip"
  );

  // Get player by Convex user ID
  const player = useQuery(
    api.players.getPlayerByUserId,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

  // Auto-initialize player if they don't exist yet
  useEffect(() => {
    if (clerkUserId && user && !player) {
      getOrCreatePlayer().catch((err) => {
        console.error("Failed to initialize player:", err);
      });
    }
  }, [clerkUserId, user, player, getOrCreatePlayer]);

  // Get player balance
  const balance = useQuery(
    api.players.getPlayerBalance,
    player ? { playerId: player._id } : "skip"
  );

  // Get player net worth  
  const netWorth = useQuery(
    api.players.getPlayerNetWorth,
    player ? { playerId: player._id } : "skip"
  );

  // Get recent transactions
  const transactions = useQuery(
    api.transactions.getPlayerTransactionHistory,
    player ? { playerId: player._id } : "skip"
  );

  return {
    player,
    balance: balance ?? 0,
    netWorth: netWorth ?? 0,
    transactions: transactions ?? [],
    isLoading: player === undefined,
  };
}
