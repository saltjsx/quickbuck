import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Loader2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/gamble";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

export default function GamblePage() {
  const { userId: clerkUserId } = useAuth();

  const user = useQuery(
    api.users.findUserByToken,
    clerkUserId ? { tokenIdentifier: clerkUserId } : "skip"
  );

  const player = useQuery(
    api.players.getPlayerByUserId,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

  const gamblingStats = useQuery(api.gambling.getGamblingStats);
  const gamblingHistory = useQuery(api.gambling.getGamblingHistory, {
    limit: 10,
  });

  if (!player || !gamblingStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Casino</h1>
        <p className="text-muted-foreground">Try your luck at our games!</p>
      </div>

      {/* Balance Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Your Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            ${(player.balance / 100).toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{gamblingStats.totalBets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {gamblingStats.winRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Wagered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${(gamblingStats.totalWagered / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Net Profit/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold flex items-center gap-1 ${
                gamblingStats.netProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {gamblingStats.netProfit >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              ${(Math.abs(gamblingStats.netProfit) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Games Tabs */}
      <Tabs defaultValue="slots" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="slots">Slot Machine</TabsTrigger>
          <TabsTrigger value="blackjack">Blackjack</TabsTrigger>
          <TabsTrigger value="dice">Dice Roll</TabsTrigger>
          <TabsTrigger value="roulette">Roulette</TabsTrigger>
        </TabsList>

        <TabsContent value="slots">
          <SlotMachine playerBalance={player.balance} />
        </TabsContent>

        <TabsContent value="blackjack">
          <Blackjack playerBalance={player.balance} />
        </TabsContent>

        <TabsContent value="dice">
          <DiceRoll playerBalance={player.balance} />
        </TabsContent>

        <TabsContent value="roulette">
          <Roulette playerBalance={player.balance} />
        </TabsContent>
      </Tabs>

      {/* Recent History */}
      {gamblingHistory && gamblingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
            <CardDescription>Your last 10 gambling sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gamblingHistory.map((game) => (
                <div
                  key={game._id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium capitalize">
                      {game.gameType}
                    </span>
                    <span
                      className={`text-sm px-2 py-1 rounded ${
                        game.result === "win"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {game.result === "win" ? "Win" : "Loss"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      Bet: ${(game.betAmount / 100).toFixed(2)}
                    </p>
                    {game.payout > 0 && (
                      <p className="text-sm text-green-600">
                        Won: ${(game.payout / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Slot Machine Component
function SlotMachine({ playerBalance }: { playerBalance: number }) {
  const [betAmount, setBetAmount] = useState("100");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const playSlots = useMutation(api.gambling.playSlots);

  const handleSpin = async () => {
    const bet = Math.round(parseFloat(betAmount) * 100);
    if (bet <= 0 || bet > playerBalance) {
      alert("Invalid bet amount");
      return;
    }

    setSpinning(true);
    setResult(null);

    try {
      const res = await playSlots({ betAmount: bet });
      setResult(res);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSpinning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slot Machine 🎰</CardTitle>
        <CardDescription>
          Match 3 symbols to win! Three of a kind pays up to 100x!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Bet Amount ($)</Label>
          <Input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            max={playerBalance / 100}
            step="1"
            disabled={spinning}
          />
        </div>

        {result && (
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-4 text-6xl">
              {result.reels.map((symbol: string, i: number) => (
                <div key={i} className="p-4 border-2 rounded-lg bg-secondary">
                  {symbol}
                </div>
              ))}
            </div>
            <div
              className={`text-2xl font-bold ${
                result.result === "win" ? "text-green-600" : "text-red-600"
              }`}
            >
              {result.result === "win"
                ? `YOU WON $${(result.payout / 100).toFixed(2)}! (${
                    result.multiplier
                  }x)`
                : "Better luck next time!"}
            </div>
          </div>
        )}

        <Button
          onClick={handleSpin}
          disabled={spinning}
          className="w-full"
          size="lg"
        >
          {spinning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Spinning...
            </>
          ) : (
            "SPIN"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Blackjack Component
function Blackjack({ playerBalance }: { playerBalance: number }) {
  const [betAmount, setBetAmount] = useState("100");
  const [gameState, setGameState] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
  const startBlackjack = useMutation(api.gambling.startBlackjack);
  const blackjackAction = useMutation(api.gambling.blackjackAction);

  const handleStart = async () => {
    const bet = Math.round(parseFloat(betAmount) * 100);
    if (bet <= 0 || bet > playerBalance) {
      alert("Invalid bet amount");
      return;
    }

    setPlaying(true);
    try {
      const game = await startBlackjack({ betAmount: bet });
      setGameState(game);
    } catch (error: any) {
      alert(error.message);
      setPlaying(false);
    }
  };

  const handleAction = async (action: "hit" | "stand" | "double") => {
    if (!gameState) return;

    try {
      const result = await blackjackAction({
        action,
        playerCards: gameState.playerCards,
        dealerCards: [
          gameState.dealerFirstCard,
          ...gameState.dealerCards.slice(1),
        ],
        betAmount: gameState.betAmount,
      });

      if (result.gameOver) {
        setGameState({ ...result, gameOver: true });
        setPlaying(false);
      } else {
        setGameState({ ...gameState, ...result });
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleReset = () => {
    setGameState(null);
    setPlaying(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blackjack 🃏</CardTitle>
        <CardDescription>
          Get as close to 21 as possible without going over!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!gameState ? (
          <>
            <div>
              <Label>Bet Amount ($)</Label>
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                min="1"
                max={playerBalance / 100}
                step="1"
              />
            </div>
            <Button onClick={handleStart} className="w-full" size="lg">
              Start Game
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-secondary">
                <p className="font-medium mb-2">Dealer's Hand</p>
                <div className="flex gap-2 text-3xl">
                  {gameState.gameOver ? (
                    gameState.dealerCards.map((card: number, i: number) => (
                      <span key={i} className="px-3 py-2 bg-background rounded">
                        {card}
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="px-3 py-2 bg-background rounded">
                        {gameState.dealerFirstCard}
                      </span>
                      <span className="px-3 py-2 bg-background rounded">?</span>
                    </>
                  )}
                </div>
                {gameState.gameOver && (
                  <p className="mt-2 font-bold">
                    Total: {gameState.dealerTotal}
                  </p>
                )}
              </div>

              <div className="p-4 border rounded-lg bg-secondary">
                <p className="font-medium mb-2">Your Hand</p>
                <div className="flex gap-2 text-3xl">
                  {gameState.playerCards.map((card: number, i: number) => (
                    <span key={i} className="px-3 py-2 bg-background rounded">
                      {card}
                    </span>
                  ))}
                </div>
                <p className="mt-2 font-bold">Total: {gameState.playerTotal}</p>
              </div>

              {gameState.gameOver && (
                <div
                  className={`text-center text-2xl font-bold p-4 rounded ${
                    gameState.result === "win"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {gameState.result === "win"
                    ? `YOU WON $${(gameState.payout / 100).toFixed(2)}!`
                    : "You Lost!"}
                </div>
              )}
            </div>

            {!gameState.gameOver ? (
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => handleAction("hit")}>Hit</Button>
                <Button onClick={() => handleAction("stand")}>Stand</Button>
                <Button
                  onClick={() => handleAction("double")}
                  variant="outline"
                >
                  Double Down
                </Button>
              </div>
            ) : (
              <Button onClick={handleReset} className="w-full">
                New Game
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Dice Roll Component
function DiceRoll({ playerBalance }: { playerBalance: number }) {
  const [betAmount, setBetAmount] = useState("100");
  const [betType, setBetType] = useState<
    "odd" | "even" | "under7" | "over7" | "exact7"
  >("odd");
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<any>(null);
  const playDice = useMutation(api.gambling.playDice);

  const handleRoll = async () => {
    const bet = Math.round(parseFloat(betAmount) * 100);
    if (bet <= 0 || bet > playerBalance) {
      alert("Invalid bet amount");
      return;
    }

    setRolling(true);
    setResult(null);

    try {
      const res = await playDice({ betAmount: bet, betType });
      setResult(res);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setRolling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dice Roll 🎲</CardTitle>
        <CardDescription>
          Roll the dice and predict the outcome!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Bet Amount ($)</Label>
          <Input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            max={playerBalance / 100}
            step="1"
            disabled={rolling}
          />
        </div>

        <div>
          <Label>Bet Type</Label>
          <RadioGroup value={betType} onValueChange={(v: any) => setBetType(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="odd" id="odd" disabled={rolling} />
              <Label htmlFor="odd">Odd (2x)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="even" id="even" disabled={rolling} />
              <Label htmlFor="even">Even (2x)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="under7" id="under7" disabled={rolling} />
              <Label htmlFor="under7">Under 7 (2x)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="over7" id="over7" disabled={rolling} />
              <Label htmlFor="over7">Over 7 (2x)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="exact7" id="exact7" disabled={rolling} />
              <Label htmlFor="exact7">Exactly 7 (5x)</Label>
            </div>
          </RadioGroup>
        </div>

        {result && (
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-4 text-6xl">
              <div className="p-4 border-2 rounded-lg bg-secondary">
                🎲 {result.die1}
              </div>
              <div className="p-4 border-2 rounded-lg bg-secondary">
                🎲 {result.die2}
              </div>
            </div>
            <p className="text-3xl font-bold">Total: {result.total}</p>
            <div
              className={`text-2xl font-bold ${
                result.result === "win" ? "text-green-600" : "text-red-600"
              }`}
            >
              {result.result === "win"
                ? `YOU WON $${(result.payout / 100).toFixed(2)}! (${
                    result.multiplier
                  }x)`
                : "Better luck next time!"}
            </div>
          </div>
        )}

        <Button
          onClick={handleRoll}
          disabled={rolling}
          className="w-full"
          size="lg"
        >
          {rolling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Rolling...
            </>
          ) : (
            "ROLL DICE"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Roulette Component
function Roulette({ playerBalance }: { playerBalance: number }) {
  const [betAmount, setBetAmount] = useState("100");
  const [betType, setBetType] = useState<
    "red" | "black" | "odd" | "even" | "low" | "high" | "green"
  >("red");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const playRoulette = useMutation(api.gambling.playRoulette);

  const handleSpin = async () => {
    const bet = Math.round(parseFloat(betAmount) * 100);
    if (bet <= 0 || bet > playerBalance) {
      alert("Invalid bet amount");
      return;
    }

    setSpinning(true);
    setResult(null);

    try {
      const res = await playRoulette({ betAmount: bet, betType });
      setResult(res);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSpinning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roulette 🎡</CardTitle>
        <CardDescription>Place your bets and spin the wheel!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Bet Amount ($)</Label>
          <Input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            max={playerBalance / 100}
            step="1"
            disabled={spinning}
          />
        </div>

        <div>
          <Label>Bet Type</Label>
          <RadioGroup value={betType} onValueChange={(v: any) => setBetType(v)}>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="red" id="red" disabled={spinning} />
                <Label htmlFor="red">Red (2x)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="black" id="black" disabled={spinning} />
                <Label htmlFor="black">Black (2x)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="odd" id="rodd" disabled={spinning} />
                <Label htmlFor="rodd">Odd (2x)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="even" id="reven" disabled={spinning} />
                <Label htmlFor="reven">Even (2x)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" disabled={spinning} />
                <Label htmlFor="low">Low 1-18 (2x)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" disabled={spinning} />
                <Label htmlFor="high">High 19-36 (2x)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="green" id="green" disabled={spinning} />
                <Label htmlFor="green">Green 0 (36x)</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {result && (
          <div className="text-center space-y-4">
            <div
              className={`text-6xl font-bold p-8 border-4 rounded-full inline-block ${
                result.color === "green"
                  ? "border-green-500 text-green-600"
                  : result.color === "red"
                  ? "border-red-500 text-red-600"
                  : "border-gray-800 text-gray-800"
              }`}
            >
              {result.number}
            </div>
            <p className="text-xl font-medium">{result.color.toUpperCase()}</p>
            <div
              className={`text-2xl font-bold ${
                result.result === "win" ? "text-green-600" : "text-red-600"
              }`}
            >
              {result.result === "win"
                ? `YOU WON $${(result.payout / 100).toFixed(2)}! (${
                    result.multiplier
                  }x)`
                : "Better luck next time!"}
            </div>
          </div>
        )}

        <Button
          onClick={handleSpin}
          disabled={spinning}
          className="w-full"
          size="lg"
        >
          {spinning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Spinning...
            </>
          ) : (
            "SPIN WHEEL"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
