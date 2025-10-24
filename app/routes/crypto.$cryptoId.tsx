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
import {
  Coins,
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

type Timeframe = "1H" | "1D" | "1W" | "1M" | "1Y" | "ALL";

export default function CryptoDetailPage() {
  const { cryptoId } = useParams();
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

  // Get crypto data
  const crypto = useQuery(
    api.crypto.getCryptocurrency,
    cryptoId ? { cryptoId: cryptoId as Id<"cryptocurrencies"> } : "skip"
  );

  // Get player's companies for account selector
  const playerCompanies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get top crypto holders
  const topHolders = useQuery(
    api.crypto.getTopCryptoHolders,
    cryptoId
      ? { cryptoId: cryptoId as Id<"cryptocurrencies">, limit: 10 }
      : "skip"
  );

  // Price history and timeframe
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1W");
  const priceHistory = useQuery(
    api.crypto.getCryptoPriceHistory,
    crypto?._id
      ? { cryptoId: crypto._id, timeframe: selectedTimeframe }
      : "skip"
  );

  // Recent trades
  const recentTrades = useQuery(
    api.crypto.getRecentCryptoTrades,
    crypto?._id ? { cryptoId: crypto._id, limit: 20 } : "skip"
  );

  // Mutations
  const buyCrypto = useMutation(api.crypto.buyCryptocurrency);

  // Purchase state
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

  // Calculate price change
  const priceChange = crypto?.previousPrice
    ? ((crypto.price - crypto.previousPrice) / crypto.previousPrice) * 100
    : 0;
  const isPositive = priceChange >= 0;

  // Calculate estimated values
  const estimatedTokens =
    purchaseType === "dollars" && crypto
      ? Math.floor((parseFloat(purchaseAmount) * 100) / crypto.price)
      : parseFloat(purchaseAmount) || 0;

  const estimatedCost =
    purchaseType === "tokens" && crypto
      ? Math.round(parseFloat(purchaseAmount) * crypto.price)
      : Math.round(parseFloat(purchaseAmount) * 100);

  // Handle buy crypto
  const handleBuyCrypto = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!player || !crypto || !selectedAccount) {
      setError("Missing required information");
      return;
    }

    const tokens =
      purchaseType === "tokens"
        ? Math.floor(parseFloat(purchaseAmount))
        : estimatedTokens;

    if (tokens <= 0) {
      setError("Invalid number of tokens");
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
        } for ${formatCurrency(Math.floor(tokens * crypto.price))}`
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

  // Calculate ownership percentages
  const calculateOwnershipPercentage = (amount: number) => {
    if (!crypto || !crypto.circulatingSupply) return 0;
    return (amount / crypto.circulatingSupply) * 100;
  };

  if (!crypto) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">
          Loading cryptocurrency information...
        </p>
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
                onClick={() => navigate("/crypto")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <Coins className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-mono text-lg font-bold"
                    >
                      {crypto.ticker}
                    </Badge>
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

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left Column - Purchase Box */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Buy Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBuyCrypto} className="space-y-4">
                    {/* Account Selector */}
                    <div className="space-y-2">
                      <Label>Payment Account</Label>
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
                      <Label>Purchase By</Label>
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

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <Label htmlFor="amount">
                        {purchaseType === "tokens"
                          ? "Number of Tokens"
                          : "Dollar Amount"}
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step={purchaseType === "tokens" ? "1" : "0.01"}
                        min="0.01"
                        placeholder={
                          purchaseType === "tokens" ? "1000" : "100.00"
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
                          <span className="text-muted-foreground">Tokens:</span>
                          <span className="font-medium">
                            {purchaseType === "tokens"
                              ? parseFloat(purchaseAmount).toLocaleString()
                              : estimatedTokens.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Total Cost:
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
                      disabled={isSubmitting || !selectedAccount}
                      className="w-full"
                    >
                      {isSubmitting ? "Processing..." : "Buy Tokens"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Crypto Info */}
            <div className="lg:col-span-2 space-y-4">
              {/* Stats Cards */}
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
                    {crypto.previousPrice && (
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
                      {formatCurrency(crypto.marketCap || 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Volume (24h)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency(crypto.volume)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Holders */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Holders</CardTitle>
                </CardHeader>
                <CardContent>
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
                        {topHolders.map((holder, index) => (
                          <TableRow key={holder._id}>
                            <TableCell className="font-medium">
                              #{index + 1}
                            </TableCell>
                            <TableCell>
                              {holder.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {calculateOwnershipPercentage(
                                  holder.amount
                                ).toFixed(2)}
                                %
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatCurrency(
                                Math.floor(holder.amount * crypto.price)
                              )}
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
                            if (
                              selectedTimeframe === "1H" ||
                              selectedTimeframe === "1D"
                            ) {
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
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
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
                            <TableCell>
                              {trade.amount.toLocaleString()}
                            </TableCell>
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
    </div>
  );
}
