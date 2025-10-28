"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/crypto.$cryptoId";
import { useAuth } from "@clerk/react-router";
import type { Id } from "convex/_generated/dataModel";
import { formatCurrency } from "~/lib/game-utils";
import { CompanyLogo } from "~/components/ui/company-logo";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
} from "lucide-react";

type Timeframe = "1H" | "1D" | "1W" | "1M" | "1Y" | "ALL";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect("/sign-in");
  return {};
}

export default function CryptoDetailPage() {
  const { cryptoId } = useParams();
  const navigate = useNavigate();
  const { userId: clerkUserId } = useAuth();

  // User and player
  const user = useQuery(
    api.users.findUserByToken,
    clerkUserId ? { tokenIdentifier: clerkUserId } : "skip"
  );
  const player = useQuery(
    api.players.getPlayerByUserId,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

  // Crypto data
  const crypto = useQuery(
    api.crypto.getCryptocurrency,
    cryptoId ? { cryptoId: cryptoId as Id<"cryptocurrencies"> } : "skip"
  );

  // Accounts
  const playerCompanies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Holders and history
  const topHolders = useQuery(
    api.crypto.getTopCryptoHolders,
    cryptoId
      ? { cryptoId: cryptoId as Id<"cryptocurrencies">, limit: 10 }
      : "skip"
  );

  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1W");
  const priceHistory = useQuery(
    api.crypto.getCryptoPriceHistory,
    crypto?._id
      ? { cryptoId: crypto._id, timeframe: selectedTimeframe }
      : "skip"
  );

  const recentTrades = useQuery(
    api.crypto.getRecentCryptoTrades,
    crypto?._id ? { cryptoId: crypto._id, limit: 20 } : "skip"
  );

  // Mutations
  const buyCrypto = useMutation(api.crypto.buyCryptocurrency);
  const sellCrypto = useMutation(api.crypto.sellCryptocurrency);

  // Player holdings for this crypto
  const holdings = useQuery(
    api.crypto.getPlayerCryptoHoldings,
    player?._id ? { playerId: player._id } : "skip"
  );
  const currentHolding = useMemo(
    () => holdings?.find((h) => h.cryptoId === (cryptoId as any)),
    [holdings, cryptoId]
  );

  // Trading state
  const [transactionMode, setTransactionMode] = useState<"buy" | "sell">("buy");
  const [purchaseType, setPurchaseType] = useState<"tokens" | "dollars">(
    "tokens"
  );
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<{
    type: "player" | "company";
    id: Id<"players"> | Id<"companies">;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Default account selection
  useEffect(() => {
    if (player && !selectedAccount) {
      setSelectedAccount({ type: "player", id: player._id as Id<"players"> });
    }
  }, [player, selectedAccount]);

  // Selected account balance (cents)
  const selectedAccountBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    if (selectedAccount.type === "player" && player) return player.balance || 0;
    const company = playerCompanies?.find((c) => c._id === selectedAccount.id);
    return company?.balance || 0;
  }, [selectedAccount, player, playerCompanies]);

  // Quick picks and Max
  const quickTokenPicks = [1, 10, 100, 1000];
  const quickDollarPicks = [100, 500, 1000, 5000];

  const handleSetMax = () => {
    if (!crypto) return;
    if (transactionMode === "sell" && currentHolding) {
      setPurchaseType("tokens");
      setPurchaseAmount(String(Math.max(0, Math.floor(currentHolding.amount))));
    } else if (transactionMode === "buy") {
      if (purchaseType === "dollars") {
        setPurchaseAmount(String(Math.max(0, selectedAccountBalance / 100)));
      } else {
        const maxTokens = Math.floor(selectedAccountBalance / crypto.price);
        setPurchaseAmount(String(Math.max(0, maxTokens)));
      }
    }
  };

  // Timeframe-based price change with fallback
  const timeframeChange = useMemo(() => {
    if (!priceHistory || priceHistory.length < 2) return null;
    const first = priceHistory[0].price;
    const last = priceHistory[priceHistory.length - 1].price;
    if (!first || first <= 0) return null;
    return ((last - first) / first) * 100;
  }, [priceHistory]);
  const fallbackChange = crypto?.previousPrice
    ? ((crypto.price - crypto.previousPrice) / crypto.previousPrice) * 100
    : 0;
  const priceChange = timeframeChange ?? fallbackChange;
  const isPositive = (priceChange ?? 0) >= 0;

  // Estimated values
  const estimatedTokens = useMemo(() => {
    if (!crypto) return 0;
    if (!purchaseAmount) return 0;
    if (purchaseType === "tokens")
      return Math.floor(parseFloat(purchaseAmount) || 0);
    const cents = Math.round(parseFloat(purchaseAmount) * 100);
    return Math.max(0, Math.floor(cents / crypto.price));
  }, [purchaseAmount, purchaseType, crypto]);

  const estimatedCost = useMemo(() => {
    if (!crypto) return 0;
    const tokens = estimatedTokens;
    return Math.max(0, Math.floor(tokens * crypto.price));
  }, [estimatedTokens, crypto]);

  // Actions
  const handleBuyCrypto = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!player || !crypto || !selectedAccount) {
      setError("Missing required information");
      return;
    }
    const tokens = estimatedTokens;
    if (!Number.isSafeInteger(tokens) || tokens <= 0) {
      setError("Enter a whole number of tokens");
      return;
    }
    setIsSubmitting(true);
    try {
      await buyCrypto({
        userId: player._id,
        cryptoId: crypto._id,
        amount: tokens,
        accountType: selectedAccount.type,
        accountId: selectedAccount.id,
      });
      setSuccess(
        `Successfully purchased ${tokens.toLocaleString()} ${
          crypto.ticker
        } for ${formatCurrency(Math.round(tokens * crypto.price))}`
      );
      setPurchaseAmount("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to purchase crypto"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSellCrypto = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!player || !crypto || !selectedAccount || !currentHolding) {
      setError("Missing required information or no tokens to sell");
      return;
    }
    const tokens = estimatedTokens;
    if (!Number.isSafeInteger(tokens) || tokens <= 0) {
      setError("Enter a whole number of tokens");
      return;
    }
    if (tokens > Math.floor(currentHolding.amount)) {
      setError(
        `You only have ${currentHolding.amount.toLocaleString()} tokens to sell`
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await sellCrypto({
        userId: player._id,
        cryptoId: crypto._id,
        amount: tokens,
        accountType: selectedAccount.type,
        accountId: selectedAccount.id,
      });
      setSuccess(
        `Successfully sold ${tokens.toLocaleString()} ${
          crypto.ticker
        } for ${formatCurrency(Math.round(tokens * crypto.price))}`
      );
      setPurchaseAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sell crypto");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ownership percentage
  const calculateOwnershipPercentage = (amount: number) => {
    if (!crypto || !crypto.totalSupply) return 0;
    return (amount / crypto.totalSupply) * 100;
  };

  if (!crypto) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading crypto information...</p>
      </div>
    );
  }

  const ownershipData = (topHolders || []).map((h) => ({
    id: h._id,
    amount: h.amount,
    percent: crypto.totalSupply ? (h.amount / crypto.totalSupply) * 100 : 0,
  }));
  const totalTop = ownershipData.reduce((s, h) => s + h.percent, 0);
  const ceoPercent = Math.max(0, 100 - totalTop);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/crypto")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <CompanyLogo
                  src={crypto.image}
                  alt={crypto.ticker || crypto.name}
                  size="lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    {crypto.ticker && (
                      <Badge
                        variant="outline"
                        className="font-mono text-lg font-bold"
                      >
                        {crypto.ticker}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {crypto.name}
                  </h1>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {crypto.description && (
            <p className="text-muted-foreground">{crypto.description}</p>
          )}

          {/* Top split */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: Price & Chart */}
            <div className="lg:col-span-2 space-y-4">
              {/* Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(crypto.price)}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          isPositive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {priceChange >= 0 ? "+" : ""}
                        {Number(priceChange).toFixed(2)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({selectedTimeframe})
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Market Cap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(crypto.marketCap || 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Circulating Supply
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {(crypto.circulatingSupply || 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Price Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Price History</CardTitle>
                      <CardDescription>
                        Interactive chart for {crypto.ticker || crypto.name}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {(
                        ["1H", "1D", "1W", "1M", "1Y", "ALL"] as Timeframe[]
                      ).map((tf) => (
                        <Button
                          key={tf}
                          variant={
                            selectedTimeframe === tf ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedTimeframe(tf)}
                        >
                          {tf}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!priceHistory || priceHistory.length === 0 ? (
                    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                      No price history available yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart
                        data={priceHistory}
                        margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                      >
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(ts) => {
                            const date = new Date(ts as number);
                            if (
                              selectedTimeframe === "1H" ||
                              selectedTimeframe === "1D"
                            ) {
                              return date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            }
                            return date.toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            });
                          }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          tickFormatter={(v) => formatCurrency(v as number)}
                          stroke="hsl(var(--muted-foreground))"
                          width={72}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => [
                            formatCurrency(value),
                            "Price",
                          ]}
                          labelFormatter={(ts) =>
                            new Date(ts as number).toLocaleString()
                          }
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#22c55e"
                          strokeWidth={3}
                          dot={false}
                          isAnimationActive
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Trade Box */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      <CardTitle>Trade Tokens</CardTitle>
                    </div>
                    {crypto.ticker && (
                      <Badge variant="outline" className="font-mono">
                        {crypto.ticker}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Price {formatCurrency(crypto.price)} • Market Cap{" "}
                    {formatCurrency(crypto.marketCap || 0)}
                  </CardDescription>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant={
                        transactionMode === "buy" ? "default" : "outline"
                      }
                      onClick={() => setTransactionMode("buy")}
                      className="flex-1"
                    >
                      Buy
                    </Button>
                    <Button
                      type="button"
                      variant={
                        transactionMode === "sell" ? "default" : "outline"
                      }
                      onClick={() => setTransactionMode("sell")}
                      className="flex-1"
                      disabled={!currentHolding || currentHolding.amount === 0}
                    >
                      Sell
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={
                      transactionMode === "buy"
                        ? handleBuyCrypto
                        : handleSellCrypto
                    }
                    className="space-y-4"
                  >
                    {/* Account/Balance */}
                    <div className="rounded-md border p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Account</span>
                        <span className="text-muted-foreground">Balance</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Select
                            value={
                              selectedAccount
                                ? `${selectedAccount.type}:${selectedAccount.id}`
                                : ""
                            }
                            onValueChange={(value) => {
                              const [type, id] = value.split(":");
                              setSelectedAccount({
                                type: type as any,
                                id: id as any,
                              });
                            }}
                          >
                            <SelectTrigger className="w-[220px]">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {player && (
                                <SelectItem value={`player:${player._id}`}>
                                  Personal ({formatCurrency(player.balance)})
                                </SelectItem>
                              )}
                              {playerCompanies?.map((c) => (
                                <SelectItem
                                  key={c._id}
                                  value={`company:${c._id}`}
                                >
                                  {c.name} ({formatCurrency(c.balance)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-right font-medium tabular-nums">
                          {formatCurrency(selectedAccountBalance)}
                        </div>
                      </div>
                    </div>

                    {/* Purchase Type */}
                    <div className="space-y-2">
                      <Label>
                        {transactionMode === "buy" ? "Purchase By" : "Sell By"}
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            purchaseType === "tokens" ? "default" : "outline"
                          }
                          onClick={() => setPurchaseType("tokens")}
                          className="flex-1"
                        >
                          Token Amount
                        </Button>
                        <Button
                          type="button"
                          variant={
                            purchaseType === "dollars" ? "default" : "outline"
                          }
                          onClick={() => setPurchaseType("dollars")}
                          className="flex-1"
                        >
                          Dollar Amount
                        </Button>
                      </div>
                    </div>

                    {/* Amount Input + Max + Picks */}
                    <div className="space-y-2">
                      <Label htmlFor="amount">
                        {purchaseType === "tokens"
                          ? "Number of Tokens"
                          : "Dollar Amount"}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="amount"
                          type="number"
                          step={purchaseType === "tokens" ? 1 : "any"}
                          min={purchaseType === "tokens" ? 0 : 0}
                          max={
                            transactionMode === "sell" &&
                            currentHolding &&
                            purchaseType === "tokens"
                              ? Math.floor(currentHolding.amount)
                              : undefined
                          }
                          placeholder={
                            purchaseType === "tokens" ? "10" : "100.00"
                          }
                          value={purchaseAmount}
                          onChange={(e) => setPurchaseAmount(e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSetMax}
                        >
                          Max
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(purchaseType === "tokens"
                          ? quickTokenPicks
                          : quickDollarPicks
                        ).map((v) => (
                          <Button
                            key={v}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPurchaseAmount(String(v))}
                          >
                            {purchaseType === "tokens"
                              ? `${v}`
                              : `$${v.toLocaleString()}`}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Estimated Values */}
                    {purchaseAmount && (
                      <div className="space-y-1 rounded-md bg-muted p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tokens:</span>
                          <span className="font-medium">
                            {estimatedTokens.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {transactionMode === "buy"
                              ? "Total Cost:"
                              : "Total Receive:"}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(estimatedCost)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Price per Token:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(crypto.price)}
                          </span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                        {success}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !selectedAccount ||
                        (transactionMode === "sell" &&
                          (!currentHolding || currentHolding.amount === 0))
                      }
                      className="w-full"
                      variant={
                        transactionMode === "sell" ? "destructive" : "default"
                      }
                    >
                      {isSubmitting
                        ? "Processing..."
                        : transactionMode === "buy"
                        ? "Buy Tokens"
                        : "Sell Tokens"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Below split: Ownership + Trades */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Ownership */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Ownership
                </CardTitle>
                <CardDescription>
                  Top holders and overall distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!topHolders || topHolders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No holders yet
                  </p>
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip
                          formatter={(value: number, name: string) => [
                            crypto.totalSupply && (value as number) > 0
                              ? `${(
                                  ((value as number) / crypto.totalSupply) *
                                  100
                                ).toFixed(2)}%`
                              : "0%",
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                          }}
                        />
                        <Legend verticalAlign="bottom" height={24} />
                        {(() => {
                          const palette = [
                            "#16a34a",
                            "#2563eb",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                            "#06b6d4",
                            "#84cc16",
                            "#e11d48",
                            "#0ea5e9",
                            "#f97316",
                            "#64748b",
                          ];
                          const holdersSum =
                            topHolders?.reduce((s, h) => s + h.amount, 0) || 0;
                          const ceoValue = Math.max(
                            0,
                            (crypto.totalSupply || 0) - holdersSum
                          );
                          const pieData = [
                            ...topHolders.map((h, idx) => ({
                              name: `Holder #${idx + 1}`,
                              value: h.amount,
                            })),
                            ...(ceoValue > 0
                              ? [{ name: "CEO", value: ceoValue }]
                              : []),
                          ];
                          return (
                            <Pie
                              dataKey="value"
                              nameKey="name"
                              data={pieData}
                              cx="50%"
                              cy="45%"
                              outerRadius={100}
                              innerRadius={60}
                              paddingAngle={2}
                            >
                              {pieData.map((_, idx) => (
                                <Cell
                                  key={idx}
                                  fill={palette[idx % palette.length]}
                                  stroke="transparent"
                                />
                              ))}
                            </Pie>
                          );
                        })()}
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {!topHolders || topHolders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No holders yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Ownership</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topHolders.map((holder, index) => {
                        const percent = calculateOwnershipPercentage(
                          holder.amount
                        );
                        return (
                          <TableRow key={holder._id}>
                            <TableCell className="font-medium">
                              #{index + 1}
                            </TableCell>
                            <TableCell>
                              {holder.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {percent.toFixed(2)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatCurrency(
                                Math.floor(holder.amount * crypto.price)
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Trades */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Trades</CardTitle>
                <CardDescription>Anonymous recent activity</CardDescription>
              </CardHeader>
              <CardContent>
                {!recentTrades || recentTrades.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No trades yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Price/Token</TableHead>
                        <TableHead>Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTrades.map((trade) => (
                        <TableRow key={trade._id}>
                          <TableCell className="text-xs">
                            {new Date(trade.timestamp).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                trade.tradeType === "buy"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {trade.tradeType.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{trade.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            {formatCurrency(trade.pricePerToken)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(trade.totalValue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
