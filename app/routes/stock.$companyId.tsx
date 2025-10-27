"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import { CompanyLogo } from "~/components/ui/company-logo";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  DollarSign,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/stock.$companyId";

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

  // Calculate price change
  const priceChange = stock?.previousPrice
    ? ((stock.price - stock.previousPrice) / stock.previousPrice) * 100
    : 0;
  const isPositive = priceChange >= 0;

  // Calculate estimated values
  const estimatedShares =
    purchaseType === "dollars" && stock
      ? (parseFloat(purchaseAmount) * 100) / stock.price
      : parseFloat(purchaseAmount) || 0;

  const estimatedCost =
    purchaseType === "shares" && stock
      ? Math.round(parseFloat(purchaseAmount) * stock.price)
      : Math.round(parseFloat(purchaseAmount) * 100);

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
      purchaseType === "shares" ? parseFloat(purchaseAmount) : estimatedShares;

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
        `Successfully purchased ${shares.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 8,
        })} shares for ${formatCurrency(Math.round(shares * stock.price))}`
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
      purchaseType === "shares" ? parseFloat(purchaseAmount) : estimatedShares;

    if (shares <= 0) {
      setError("Invalid number of shares");
      return;
    }

    if (shares > currentHolding.shares) {
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
        `Successfully sold ${shares.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 8,
        })} shares for ${formatCurrency(Math.round(shares * stock.price))}`
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
                  src={company?.logo}
                  alt={company?.name || "Company"}
                  size="lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-mono text-lg font-bold"
                    >
                      {stock?.ticker}
                    </Badge>
                    {company?.isPublic && (
                      <Badge variant="default">Public</Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {company?.name}
                  </h1>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {company.description && (
            <p className="text-muted-foreground">{company.description}</p>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left Column - Purchase Box */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Trade Shares
                  </CardTitle>
                  {/* Buy/Sell Toggle */}
                  <div className="flex gap-2 mt-2">
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
                    {/* Show holdings if selling */}
                    {transactionMode === "sell" && currentHolding && (
                      <div className="rounded-md bg-muted p-3">
                        <p className="text-sm text-muted-foreground">
                          Your Holdings
                        </p>
                        <p className="text-lg font-bold">
                          {currentHolding.shares.toLocaleString()} shares
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Worth{" "}
                          {formatCurrency(currentHolding.shares * stock.price)}
                        </p>
                      </div>
                    )}

                    {/* Account Selector */}
                    <div className="space-y-2">
                      <Label>
                        {transactionMode === "buy"
                          ? "Payment Account"
                          : "Receive To"}
                      </Label>
                      <Select
                        value={
                          selectedAccount
                            ? `${selectedAccount.type}:${selectedAccount.id}`
                            : ""
                        }
                        onValueChange={(value) => {
                          const [type, id] = value.split(":");
                          setSelectedAccount({
                            type: type as "player" | "company",
                            id: id as any,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {player && (
                            <SelectItem value={`player:${player._id}`}>
                              Personal ({formatCurrency(player.balance)})
                            </SelectItem>
                          )}
                          {playerCompanies?.map((company) => (
                            <SelectItem
                              key={company._id}
                              value={`company:${company._id}`}
                            >
                              {company.name} ({formatCurrency(company.balance)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <Label htmlFor="amount">
                        {purchaseType === "shares"
                          ? "Number of Shares"
                          : "Dollar Amount"}
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="any"
                        min="0.00000001"
                        max={
                          transactionMode === "sell" &&
                          currentHolding &&
                          purchaseType === "shares"
                            ? currentHolding.shares
                            : undefined
                        }
                        placeholder={
                          purchaseType === "shares" ? "0.5" : "1000.00"
                        }
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                        required
                      />
                    </div>

                    {/* Estimated Values */}
                    {purchaseAmount && (
                      <div className="rounded-md bg-muted p-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shares:</span>
                          <span className="font-medium">
                            {purchaseType === "shares"
                              ? parseFloat(purchaseAmount).toLocaleString()
                              : estimatedShares.toLocaleString()}
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

            {/* Right Column - Stock Info */}
            <div className="lg:col-span-2 space-y-4">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Stock Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(stock.price)}
                    </p>
                    {stock.previousPrice && (
                      <div className="flex items-center gap-1 mt-1">
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
                          {isPositive ? "+" : ""}
                          {priceChange.toFixed(2)}%
                        </span>
                      </div>
                    )}
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
                      {formatCurrency(stock.marketCap || 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Shares
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {stock.totalShares.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Ownership Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Shareholders</CardTitle>
                </CardHeader>
                <CardContent>
                  {!topHolders || topHolders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No shareholders yet
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
                        {topHolders.map((holder, index) => (
                          <TableRow key={holder._id}>
                            <TableCell className="font-medium">
                              #{index + 1}
                            </TableCell>
                            <TableCell>
                              {holder.shares.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {calculateOwnershipPercentage(
                                  holder.shares
                                ).toFixed(2)}
                                %
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatCurrency(holder.shares * stock.price)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Price Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Price History</CardTitle>
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
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={priceHistory}>
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(ts) => {
                            const date = new Date(ts);
                            if (selectedTimeframe === "1H") {
                              return date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            } else if (selectedTimeframe === "1D") {
                              return date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            } else {
                              return date.toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              });
                            }
                          }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          tickFormatter={(value) => formatCurrency(value)}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            formatCurrency(value),
                            "Price",
                          ]}
                          labelFormatter={(ts) => new Date(ts).toLocaleString()}
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
                          isAnimationActive={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Recent Trades */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  {!recentTrades || recentTrades.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No trades yet
                    </p>
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
                            <TableCell>
                              {trade.shares.toLocaleString()}
                            </TableCell>
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
    </div>
  );
}
