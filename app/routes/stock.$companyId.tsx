"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/stock.$companyId";
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

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

export default function StockDetailPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
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

  // Get company and stock data
  const company = useQuery(
    api.companies.getCompany,
    companyId ? { companyId: companyId as Id<"companies"> } : "skip"
  );
  const stock = useQuery(
    api.stocks.getCompanyStockInfo,
    companyId ? { companyId: companyId as Id<"companies"> } : "skip"
  );

  // Get player's companies for account selector
  const playerCompanies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get top stock holders
  const topHolders = useQuery(
    api.stocks.getTopStockHolders,
    companyId ? { companyId: companyId as Id<"companies">, limit: 10 } : "skip"
  );

  // Price history and timeframe
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1W");
  const priceHistory = useQuery(
    api.stocks.getStockPriceHistory,
    stock?._id ? { stockId: stock._id, timeframe: selectedTimeframe } : "skip"
  );

  // Recent trades
  const recentTrades = useQuery(
    api.stocks.getRecentStockTrades,
    stock?._id ? { stockId: stock._id, limit: 20 } : "skip"
  );

  // Mutations
  const buyStock = useMutation(api.stocks.buyStock);
  const sellStock = useMutation(api.stocks.sellStock);

  // Get player's holdings for this stock
  const playerHoldings = useQuery(
    api.stocks.getPlayerStockHoldings,
    player?._id ? { playerId: player._id } : "skip"
  );
  const currentHolding = playerHoldings?.find((h) => h.companyId === companyId);

  // Transaction mode state
  const [transactionMode, setTransactionMode] = useState<"buy" | "sell">("buy");

  // Purchase state
  const [purchaseType, setPurchaseType] = useState<"shares" | "dollars">(
    "shares"
  );
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<{
    type: "player" | "company";
    id: Id<"players"> | Id<"companies">;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Default select personal account when available
  useEffect(() => {
    if (player && !selectedAccount) {
      setSelectedAccount({ type: "player", id: player._id as Id<"players"> });
    }
  }, [player, selectedAccount]);

  // Derived: selected account balance (in cents)
  const selectedAccountBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    if (selectedAccount.type === "player" && player) return player.balance || 0;
    const company = playerCompanies?.find((c) => c._id === selectedAccount.id);
    return company?.balance || 0;
  }, [selectedAccount, player, playerCompanies]);

  // Quick picks and Max setter
  const quickSharePicks = [1, 10, 100, 1000];
  const quickDollarPicks = [100, 1000, 5000, 10000];

  const handleSetMax = () => {
    if (!stock) return;
    if (transactionMode === "sell" && currentHolding) {
      setPurchaseType("shares");
      setPurchaseAmount(String(Math.floor(currentHolding.shares)));
    } else if (transactionMode === "buy") {
      if (purchaseType === "dollars") {
        setPurchaseAmount(String(Math.max(0, selectedAccountBalance / 100)));
      } else {
        const maxShares = Math.floor(selectedAccountBalance / stock.price);
        setPurchaseAmount(String(Math.max(0, maxShares)));
      }
    }
  };

  // Calculate price change
  // Price change based on selected timeframe (fallback to previousPrice)
  const timeframeChange = useMemo(() => {
    if (!priceHistory || priceHistory.length < 2) return null;
    const first = priceHistory[0].price;
    const last = priceHistory[priceHistory.length - 1].price;
    if (!first || first <= 0) return null;
    return ((last - first) / first) * 100;
  }, [priceHistory]);

  const fallbackChange = stock?.previousPrice
    ? ((stock.price - stock.previousPrice) / stock.previousPrice) * 100
    : 0;
  const priceChange = timeframeChange ?? fallbackChange;
  const isPositive = (priceChange ?? 0) >= 0;

  // Calculate estimated values
  const estimatedShares = useMemo(() => {
    if (!stock) return 0;
    if (!purchaseAmount) return 0;
    if (purchaseType === "shares")
      return Math.floor(parseFloat(purchaseAmount) || 0);
    // dollars -> convert dollars to cents then floor shares
    const cents = Math.round(parseFloat(purchaseAmount) * 100);
    return Math.floor(cents / stock.price);
  }, [purchaseAmount, purchaseType, stock]);

  const estimatedCost = useMemo(() => {
    if (!stock) return 0;
    if (!purchaseAmount) return 0;
    if (purchaseType === "shares") {
      const shares = Math.floor(parseFloat(purchaseAmount) || 0);
      return Math.max(0, shares) * stock.price;
    }
    // dollars input is already dollar amount -> convert to cents
    return Math.max(0, Math.round(parseFloat(purchaseAmount) * 100));
  }, [purchaseAmount, purchaseType, stock]);

  // Handle buy stock
  const handleBuyStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!player || !stock || !selectedAccount) {
      setError("Missing required information");
      return;
    }

    const shares =
      purchaseType === "shares"
        ? Math.floor(parseFloat(purchaseAmount))
        : Math.floor(estimatedShares);

    if (shares <= 0) {
      setError("Invalid number of shares");
      return;
    }

    setIsSubmitting(true);
    try {
      await buyStock({
        userId: player._id,
        stockId: stock._id,
        shares,
        accountType: selectedAccount.type,
        accountId: selectedAccount.id,
      });

      setSuccess(
        `Successfully purchased ${shares.toLocaleString()} shares for ${formatCurrency(
          Math.round(shares * stock.price)
        )}`
      );
      setPurchaseAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purchase stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sell stock
  const handleSellStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!player || !stock || !selectedAccount || !currentHolding) {
      setError("Missing required information or no shares to sell");
      return;
    }

    const shares =
      purchaseType === "shares"
        ? Math.floor(parseFloat(purchaseAmount))
        : Math.floor(estimatedShares);

    if (shares <= 0) {
      setError("Invalid number of shares");
      return;
    }

    if (shares > Math.floor(currentHolding.shares)) {
      setError(
        `You only have ${currentHolding.shares.toLocaleString()} shares to sell`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await sellStock({
        userId: player._id,
        stockId: stock._id,
        shares,
        accountType: selectedAccount.type,
        accountId: selectedAccount.id,
      });

      setSuccess(
        `Successfully sold ${shares.toLocaleString()} shares for ${formatCurrency(
          Math.round(shares * stock.price)
        )}`
      );
      setPurchaseAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sell stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate ownership percentages
  const calculateOwnershipPercentage = (shares: number) => {
    if (!stock || !stock.totalShares) return 0;
    return (shares / stock.totalShares) * 100;
  };

  if (!company || !stock) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading stock information...</p>
      </div>
    );
  }

  // Ownership percentages for visualizer
  const ownershipData = (topHolders || []).map((h) => ({
    id: h._id,
    shares: h.shares,
    percent: stock.totalShares ? (h.shares / stock.totalShares) * 100 : 0,
  }));
  const totalTop = ownershipData.reduce((s, h) => s + h.percent, 0);
  const othersPercent = Math.max(0, 100 - totalTop);

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
                onClick={() => navigate("/stocks")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <CompanyLogo
                  src={company.logo}
                  alt={company.ticker || company.name}
                  size="lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    {company.ticker && (
                      <Badge
                        variant="outline"
                        className="font-mono text-lg font-bold"
                      >
                        {company.ticker}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {company.name}
                  </h1>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {company.description && (
            <p className="text-muted-foreground">{company.description}</p>
          )}

          {/* Top split: Chart (left) and Trade box (right) */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left Column - Price & Chart */}
            <div className="lg:col-span-2 space-y-4">
              {/* Price and stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(stock.price)}
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
                      {formatCurrency(
                        stock.marketCap || company.marketCap || 0
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Shares Outstanding
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {stock.totalShares.toLocaleString()}
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
                        Interactive chart for {company.ticker || company.name}
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

            {/* Right Column - Trade Box */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      <CardTitle>Trade Shares</CardTitle>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {company.ticker || ""}
                    </Badge>
                  </div>
                  <CardDescription>
                    Price {formatCurrency(stock.price)} • Market Cap{" "}
                    {formatCurrency(stock.marketCap || company.marketCap || 0)}
                  </CardDescription>
                  {/* Buy/Sell Toggle */}
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
                      disabled={!currentHolding || currentHolding.shares === 0}
                    >
                      Sell
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={
                      transactionMode === "buy"
                        ? handleBuyStock
                        : handleSellStock
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
                            purchaseType === "shares" ? "default" : "outline"
                          }
                          onClick={() => setPurchaseType("shares")}
                          className="flex-1"
                        >
                          Share Amount
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
                        {purchaseType === "shares"
                          ? "Number of Shares"
                          : "Dollar Amount"}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="amount"
                          type="number"
                          step={purchaseType === "shares" ? 1 : "any"}
                          min={0}
                          max={
                            transactionMode === "sell" &&
                            currentHolding &&
                            purchaseType === "shares"
                              ? Math.floor(currentHolding.shares)
                              : undefined
                          }
                          placeholder={
                            purchaseType === "shares" ? "10" : "100.00"
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
                      {/* Quick picks */}
                      <div className="flex flex-wrap gap-2">
                        {(purchaseType === "shares"
                          ? quickSharePicks
                          : quickDollarPicks
                        ).map((v) => (
                          <Button
                            key={v}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPurchaseAmount(String(v))}
                          >
                            {purchaseType === "shares"
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
                          <span className="text-muted-foreground">Shares:</span>
                          <span className="font-medium">
                            {estimatedShares.toLocaleString()}
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
                            Price per Share:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(stock.price)}
                          </span>
                        </div>
                        {stock.totalShares > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Est. Ownership:
                            </span>
                            <span className="font-medium">
                              {(
                                (estimatedShares / stock.totalShares) * 100 || 0
                              ).toFixed(4)}
                              %
                            </span>
                          </div>
                        )}
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
                          (!currentHolding || currentHolding.shares === 0))
                      }
                      className="w-full"
                      variant={
                        transactionMode === "sell" ? "destructive" : "default"
                      }
                    >
                      {isSubmitting
                        ? "Processing..."
                        : transactionMode === "buy"
                        ? "Buy Shares"
                        : "Sell Shares"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Below the split: Ownership + Recent Trades */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Ownership Visualizer */}
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
                {/* Pie chart */}
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
                            `${
                              ((value as number) / stock.totalShares) * 100 > 0
                                ? (
                                    ((value as number) / stock.totalShares) *
                                    100
                                  ).toFixed(2) + "%"
                                : "0%"
                            }`,
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
                            "#16a34a", // green-600
                            "#2563eb", // blue-600
                            "#f59e0b", // amber-500
                            "#ef4444", // red-500
                            "#8b5cf6", // violet-500
                            "#06b6d4", // cyan-500
                            "#84cc16", // lime-500
                            "#e11d48", // rose-600
                            "#0ea5e9", // sky-500
                            "#f97316", // orange-500
                            "#64748b", // slate-500
                          ];
                          const holdersSum =
                            topHolders?.reduce((s, h) => s + h.shares, 0) || 0;
                          const ceoValue = Math.max(
                            0,
                            (stock.totalShares || 0) - holdersSum
                          );
                          const pieData = [
                            ...topHolders.map((h, idx) => ({
                              name: `Holder #${idx + 1}`,
                              value: h.shares,
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

                {/* Legend + table of top holders */}
                {!topHolders || topHolders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No holders yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Shares</TableHead>
                        <TableHead>Ownership</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topHolders.map((holder, index) => {
                        const percent = calculateOwnershipPercentage(
                          holder.shares
                        );
                        return (
                          <TableRow key={holder._id}>
                            <TableCell className="font-medium">
                              #{index + 1}
                            </TableCell>
                            <TableCell>
                              {holder.shares.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {percent.toFixed(2)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatCurrency(
                                Math.floor(holder.shares * stock.price)
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
                        <TableHead>Shares</TableHead>
                        <TableHead>Price/Share</TableHead>
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
                          <TableCell>{trade.shares.toLocaleString()}</TableCell>
                          <TableCell>
                            {formatCurrency(trade.pricePerShare)}
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
