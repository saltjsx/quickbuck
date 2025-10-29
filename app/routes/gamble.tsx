"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import { Coins, Dice1, Spade, Target, DollarSign } from "lucide-react";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/gamble";
import type { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";
import { animate } from "motion";
import { cn } from "~/lib/utils";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

// Slots Game Component
function SlotsGame({ balance }: { balance: number }) {
  const [betAmount, setBetAmount] = useState("10");
  const [reels, setReels] = useState<string[]>(["🍒", "🍋", "🍊"]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const playSlots = useMutation(api.gambling.playSlots);

  const handleSpin = async () => {
    const betDollars = parseFloat(betAmount);
    if (isNaN(betDollars) || betDollars < 1 || betDollars > 10000) {
      toast.error("Bet must be between $1 and $10,000");
      return;
    }

    const betCents = Math.round(betDollars * 100);
    const balanceCents = balance;

    if (betCents > balanceCents) {
      toast.error("Insufficient balance");
      return;
    }

    setIsSpinning(true);
    setLastResult(null);

    // Animate spinning
    const symbols = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"];
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ]);
      spinCount++;
      if (spinCount >= 20) {
        clearInterval(spinInterval);
      }
    }, 100);

    try {
      const result = await playSlots({ betAmount: betCents });

      setTimeout(() => {
        setReels(result.reels);
        setLastResult(result);
        setIsSpinning(false);

        if (result.result === "win") {
          toast.success(
            `You won $${(result.payout / 100).toFixed(2)}! (${
              result.multiplier
            }x)`
          );
        } else {
          toast.error("Better luck next time!");
        }
      }, 2000);
    } catch (error: any) {
      clearInterval(spinInterval);
      setIsSpinning(false);
      toast.error(error.message || "Failed to spin");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-500" />
          <CardTitle>Slot Machine</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reels */}
        <div className="flex justify-center items-center gap-4 py-8">
          {reels.map((symbol, i) => (
            <div
              key={i}
              className={cn(
                "w-24 h-24 flex items-center justify-center text-5xl rounded-lg border-2 border-border bg-muted",
                isSpinning && "animate-pulse"
              )}
            >
              {symbol}
            </div>
          ))}
        </div>

        {/* Bet Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">
                Bet Amount ($)
              </label>
              <Input
                type="number"
                placeholder="10"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isSpinning}
                min="1"
                max="10000"
                step="0.01"
              />
            </div>
            <Button
              onClick={handleSpin}
              disabled={isSpinning}
              size="lg"
              className="mt-6"
            >
              {isSpinning ? "Spinning..." : "Spin"}
            </Button>
          </div>

          {/* Quick bet buttons in dollars */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 5, 10, 50].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(amount.toString())}
                disabled={isSpinning}
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Payout Info */}
        <div className="text-sm text-muted-foreground space-y-1 p-3 rounded-lg bg-muted">
          <p>💎💎💎 = 5x | 7️⃣7️⃣7️⃣ = 10x</p>
          <p>Three of a kind = 3x | Two of a kind = 1.5x</p>
        </div>

        {lastResult && !isSpinning && (
          <div
            className={cn(
              "p-4 rounded-lg border",
              lastResult.result === "win"
                ? "bg-green-500/10 border-green-500"
                : "bg-red-500/10 border-red-500"
            )}
          >
            <p className="font-semibold">
              {lastResult.result === "win"
                ? `🎉 Won $${(lastResult.payout / 100).toFixed(2)}!`
                : `😞 Lost $${betAmount}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Blackjack Game Component
function BlackjackGame({ balance }: { balance: number }) {
  const [betAmount, setBetAmount] = useState("10");
  const [gameState, setGameState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startBlackjack = useMutation(api.gambling.startBlackjack);
  const hitBlackjack = useMutation(api.gambling.hitBlackjack);
  const standBlackjack = useMutation(api.gambling.standBlackjack);
  const activeGame = useQuery(api.gambling.getActiveBlackjackGame);

  const handleStart = async () => {
    const betDollars = parseFloat(betAmount);
    if (isNaN(betDollars) || betDollars < 1 || betDollars > 10000) {
      toast.error("Bet must be between $1 and $10,000");
      return;
    }

    const betCents = Math.round(betDollars * 100);
    const balanceCents = balance;

    if (betCents > balanceCents) {
      toast.error("Insufficient balance");
      return;
    }

    setIsLoading(true);
    try {
      const result = await startBlackjack({ betAmount: betCents });
      setGameState(result);

      if (result.gameState === "blackjack") {
        toast.success(
          `Blackjack! You won $${(result.payout / 100).toFixed(2)}!`
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start game");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHit = async () => {
    setIsLoading(true);
    try {
      const result = await hitBlackjack({});
      setGameState(result);

      if (result.gameState === "player_bust") {
        toast.error("Bust! You went over 21.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to hit");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStand = async () => {
    setIsLoading(true);
    try {
      const result = await standBlackjack({});
      setGameState(result);

      if (
        result.gameState === "dealer_bust" ||
        result.gameState === "player_win"
      ) {
        toast.success(`You won $${(result.payout / 100).toFixed(2)}!`);
      } else if (result.gameState === "push") {
        toast.info("Push! Bet returned.");
      } else {
        toast.error("Dealer wins.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to stand");
    } finally {
      setIsLoading(false);
    }
  };

  const renderCard = (value: number) => {
    if (value === 1) return "A";
    if (value === 10) return "10";
    if (value === 11) return "J";
    return value.toString();
  };

  const getGameMessage = () => {
    if (!gameState) return "";

    switch (gameState.gameState) {
      case "blackjack":
        return "🎉 Blackjack! You win 2.5x!";
      case "player_bust":
        return "💥 Bust! You went over 21.";
      case "dealer_bust":
        return "🎉 Dealer busts! You win!";
      case "player_win":
        return "🎉 You win!";
      case "dealer_win":
        return "😞 Dealer wins.";
      case "push":
        return "🤝 Push! Bet returned.";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Spade className="h-5 w-5 text-foreground" />
          <CardTitle>Blackjack</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!gameState ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">
                  Bet Amount ($)
                </label>
                <Input
                  type="number"
                  placeholder="10"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={isLoading}
                  min="1"
                  max="10000"
                  step="0.01"
                />
              </div>
              <Button
                onClick={handleStart}
                disabled={isLoading}
                size="lg"
                className="mt-6"
              >
                {isLoading ? "Dealing..." : "Deal"}
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 50].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(amount.toString())}
                  disabled={isLoading}
                >
                  ${amount}
                </Button>
              ))}
            </div>

            <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted">
              <p>Get 21 or closer than dealer without going over!</p>
              <p>Blackjack pays 2.5x</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dealer Hand */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Dealer&apos;s Hand ({gameState.dealerValue})
              </p>
              <div className="flex gap-2">
                {gameState.dealerHand.map((card: number, i: number) => (
                  <div
                    key={i}
                    className="w-16 h-20 flex items-center justify-center text-2xl rounded border-2 border-border bg-card"
                  >
                    {renderCard(card)}
                  </div>
                ))}
              </div>
            </div>

            {/* Player Hand */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Your Hand ({gameState.playerValue})
              </p>
              <div className="flex gap-2">
                {gameState.playerHand.map((card: number, i: number) => (
                  <div
                    key={i}
                    className="w-16 h-20 flex items-center justify-center text-2xl rounded border-2 border-primary bg-card"
                  >
                    {renderCard(card)}
                  </div>
                ))}
              </div>
            </div>

            {/* Game Controls */}
            {gameState.gameState === "playing" && (
              <div className="flex gap-2">
                <Button
                  onClick={handleHit}
                  disabled={isLoading}
                  variant="default"
                >
                  Hit
                </Button>
                <Button
                  onClick={handleStand}
                  disabled={isLoading}
                  variant="outline"
                >
                  Stand
                </Button>
              </div>
            )}

            {/* Result */}
            {gameState.gameState !== "playing" && (
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  gameState.gameState === "blackjack" ||
                    gameState.gameState === "player_win" ||
                    gameState.gameState === "dealer_bust" ||
                    gameState.gameState === "push"
                    ? "bg-green-500/10 border-green-500"
                    : "bg-red-500/10 border-red-500"
                )}
              >
                <p className="font-semibold">{getGameMessage()}</p>
                <Button
                  onClick={() => setGameState(null)}
                  className="mt-4"
                  variant="outline"
                >
                  New Game
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Dice Game Component
function DiceGame({ balance }: { balance: number }) {
  const [betAmount, setBetAmount] = useState("10");
  const [prediction, setPrediction] = useState<"under" | "over" | "seven">(
    "over"
  );
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const playDice = useMutation(api.gambling.playDice);

  const handleRoll = async () => {
    const betDollars = parseFloat(betAmount);
    if (isNaN(betDollars) || betDollars < 1 || betDollars > 10000) {
      toast.error("Bet must be between $1 and $10,000");
      return;
    }

    const betCents = Math.round(betDollars * 100);
    const balanceCents = balance;

    if (betCents > balanceCents) {
      toast.error("Insufficient balance");
      return;
    }

    setIsRolling(true);
    setLastResult(null);

    // Animate rolling
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ] as [number, number]);
      rollCount++;
      if (rollCount >= 15) {
        clearInterval(rollInterval);
      }
    }, 100);

    try {
      const result = await playDice({ betAmount: betCents, prediction });

      setTimeout(() => {
        setDice([result.die1, result.die2]);
        setLastResult(result);
        setIsRolling(false);

        if (result.result === "win") {
          toast.success(
            `You won $${(result.payout / 100).toFixed(2)}! (${
              result.multiplier
            }x)`
          );
        } else {
          toast.error("Better luck next time!");
        }
      }, 1500);
    } catch (error: any) {
      clearInterval(rollInterval);
      setIsRolling(false);
      toast.error(error.message || "Failed to roll");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Dice1 className="h-5 w-5 text-blue-500" />
          <CardTitle>Dice Roll</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dice Display */}
        <div className="flex justify-center items-center gap-6 py-8">
          {dice.map((die, i) => (
            <div
              key={i}
              className={cn(
                "w-20 h-20 flex items-center justify-center text-4xl rounded-lg border-2 border-border bg-muted",
                isRolling && "animate-bounce"
              )}
            >
              {die}
            </div>
          ))}
          <div className="text-3xl font-bold text-muted-foreground">
            = {dice[0] + dice[1]}
          </div>
        </div>

        {/* Prediction Selection */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Make your prediction:</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={prediction === "under" ? "default" : "outline"}
              onClick={() => setPrediction("under")}
              disabled={isRolling}
            >
              Under 7
            </Button>
            <Button
              variant={prediction === "seven" ? "default" : "outline"}
              onClick={() => setPrediction("seven")}
              disabled={isRolling}
            >
              Exactly 7
            </Button>
            <Button
              variant={prediction === "over" ? "default" : "outline"}
              onClick={() => setPrediction("over")}
              disabled={isRolling}
            >
              Over 7
            </Button>
          </div>

          <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted">
            <p>
              Under/Over: <strong>2.5x</strong> | Exactly 7: <strong>5x</strong>
            </p>
          </div>
        </div>

        {/* Bet Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">
                Bet Amount ($)
              </label>
              <Input
                type="number"
                placeholder="10"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isRolling}
                min="1"
                max="10000"
                step="0.01"
              />
            </div>
            <Button
              onClick={handleRoll}
              disabled={isRolling}
              size="lg"
              className="mt-6"
            >
              {isRolling ? "Rolling..." : "Roll"}
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 5, 10, 50].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(amount.toString())}
                disabled={isRolling}
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>

        {lastResult && !isRolling && (
          <div
            className={cn(
              "p-4 rounded-lg border",
              lastResult.result === "win"
                ? "bg-green-500/10 border-green-500"
                : "bg-red-500/10 border-red-500"
            )}
          >
            <p className="font-semibold">
              {lastResult.result === "win"
                ? `🎉 Won $${(lastResult.payout / 100).toFixed(2)}!`
                : `😞 Lost $${betAmount}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Roulette Game Component
function RouletteGame({ balance }: { balance: number }) {
  const [betAmount, setBetAmount] = useState("10");
  const [betType, setBetType] = useState<
    "red" | "black" | "green" | "even" | "odd" | "low" | "high"
  >("red");
  const [number, setNumber] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const playRoulette = useMutation(api.gambling.playRoulette);

  const handleSpin = async () => {
    const betDollars = parseFloat(betAmount);
    if (isNaN(betDollars) || betDollars < 1 || betDollars > 10000) {
      toast.error("Bet must be between $1 and $10,000");
      return;
    }

    const betCents = Math.round(betDollars * 100);
    const balanceCents = balance;

    if (betCents > balanceCents) {
      toast.error("Insufficient balance");
      return;
    }

    setIsSpinning(true);
    setLastResult(null);

    // Animate spinning
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      setNumber(Math.floor(Math.random() * 37));
      spinCount++;
      if (spinCount >= 25) {
        clearInterval(spinInterval);
      }
    }, 80);

    try {
      const result = await playRoulette({ betAmount: betCents, betType });

      setTimeout(() => {
        setNumber(result.number);
        setLastResult(result);
        setIsSpinning(false);

        if (result.result === "win") {
          toast.success(
            `You won $${(result.payout / 100).toFixed(2)}! (${
              result.multiplier
            }x)`
          );
        } else {
          toast.error("Better luck next time!");
        }
      }, 2000);
    } catch (error: any) {
      clearInterval(spinInterval);
      setIsSpinning(false);
      toast.error(error.message || "Failed to spin");
    }
  };

  const getNumberColor = (num: number) => {
    if (num === 0) return "green";
    const redNumbers = [
      1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
    ];
    return redNumbers.includes(num) ? "red" : "black";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-500" />
          <CardTitle>Roulette</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Roulette Wheel Display */}
        <div className="flex flex-col items-center gap-4 py-8">
          <div
            className={cn(
              "w-32 h-32 flex items-center justify-center text-5xl rounded-full border-4",
              isSpinning && "animate-spin",
              getNumberColor(number) === "green" &&
                "border-green-500 bg-green-500/10",
              getNumberColor(number) === "red" &&
                "border-red-500 bg-red-500/10",
              getNumberColor(number) === "black" &&
                "border-gray-800 bg-gray-800/10"
            )}
          >
            {number}
          </div>
          <Badge
            variant={getNumberColor(number) === "green" ? "default" : "outline"}
          >
            {getNumberColor(number).toUpperCase()}
          </Badge>
        </div>

        {/* Simplified Bet Type Selection */}
        <div className="space-y-4">
          <p className="text-sm font-semibold">Choose your bet:</p>

          {/* Row 1: Colors */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={betType === "red" ? "default" : "outline"}
              onClick={() => setBetType("red")}
              disabled={isSpinning}
              className={betType === "red" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              🔴 Red
            </Button>
            <Button
              variant={betType === "black" ? "default" : "outline"}
              onClick={() => setBetType("black")}
              disabled={isSpinning}
              className={
                betType === "black" ? "bg-gray-800 hover:bg-gray-900" : ""
              }
            >
              ⚫ Black
            </Button>
            <Button
              variant={betType === "green" ? "default" : "outline"}
              onClick={() => setBetType("green")}
              disabled={isSpinning}
              className={
                betType === "green" ? "bg-green-600 hover:bg-green-700" : ""
              }
            >
              🟢 Green (0)
            </Button>
          </div>

          {/* Row 2: Even/Odd */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={betType === "even" ? "default" : "outline"}
              onClick={() => setBetType("even")}
              disabled={isSpinning}
            >
              Even Numbers
            </Button>
            <Button
              variant={betType === "odd" ? "default" : "outline"}
              onClick={() => setBetType("odd")}
              disabled={isSpinning}
            >
              Odd Numbers
            </Button>
          </div>

          {/* Row 3: High/Low */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={betType === "low" ? "default" : "outline"}
              onClick={() => setBetType("low")}
              disabled={isSpinning}
            >
              Low (1-18)
            </Button>
            <Button
              variant={betType === "high" ? "default" : "outline"}
              onClick={() => setBetType("high")}
              disabled={isSpinning}
            >
              High (19-36)
            </Button>
          </div>

          {/* Payouts Info */}
          <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            <p>
              💰 <strong>Payouts:</strong>
            </p>
            <p>
              Red/Black/Even/Odd/High/Low: <strong>2x</strong> your bet
            </p>
            <p>
              Green (0): <strong>35x</strong> your bet
            </p>
          </div>
        </div>

        {/* Bet Amount Input */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">
                Bet Amount ($)
              </label>
              <Input
                type="number"
                placeholder="10"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isSpinning}
                min="1"
                max="10000"
                step="0.01"
              />
            </div>
            <Button
              onClick={handleSpin}
              disabled={isSpinning}
              size="lg"
              className="mt-6"
            >
              {isSpinning ? "Spinning..." : "Spin"}
            </Button>
          </div>

          {/* Quick bet buttons in dollars */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 5, 10, 50].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(amount.toString())}
                disabled={isSpinning}
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>

        {lastResult && !isSpinning && (
          <div
            className={cn(
              "p-4 rounded-lg border",
              lastResult.result === "win"
                ? "bg-green-500/10 border-green-500"
                : "bg-red-500/10 border-red-500"
            )}
          >
            <p className="font-semibold">
              {lastResult.result === "win"
                ? `🎉 Won $${(lastResult.payout / 100).toFixed(2)}!`
                : `😞 Lost $${betAmount}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GamblePage() {
  const { userId: clerkUserId } = useAuth();

  // Get user and player
  const user = useQuery(
    api.users.findUserByToken,
    clerkUserId ? { tokenIdentifier: clerkUserId } : "skip"
  );
  const player = useQuery(
    api.players.getPlayerByUserId,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );
  const balance = useQuery(
    api.players.getPlayerBalance,
    player?._id ? { playerId: player._id } : "skip"
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Page Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Casino
            </h1>
            <p className="text-sm text-muted-foreground">
              Try your luck with slots, blackjack, dice, and roulette.
            </p>
          </div>

          {/* Balance Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    Your Balance
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  ${((balance ?? 0) / 100).toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Games Tabs */}
          <Tabs defaultValue="slots" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="slots">Slots</TabsTrigger>
              <TabsTrigger value="blackjack">Blackjack</TabsTrigger>
              <TabsTrigger value="dice">Dice</TabsTrigger>
              <TabsTrigger value="roulette">Roulette</TabsTrigger>
            </TabsList>

            <TabsContent value="slots" className="mt-6">
              <SlotsGame balance={balance ?? 0} />
            </TabsContent>

            <TabsContent value="blackjack" className="mt-6">
              <BlackjackGame balance={balance ?? 0} />
            </TabsContent>

            <TabsContent value="dice" className="mt-6">
              <DiceGame balance={balance ?? 0} />
            </TabsContent>

            <TabsContent value="roulette" className="mt-6">
              <RouletteGame balance={balance ?? 0} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
