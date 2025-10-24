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
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  DollarSign,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

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

  // Mutations
  const buyStock = useMutation(api.stocks.buyStock);
  const sellStock = useMutation(api.stocks.sellStock);

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
      ? Math.floor((parseFloat(purchaseAmount) * 100) / stock.price)
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
      purchaseType === "shares"
        ? Math.floor(parseFloat(purchaseAmount))
        : estimatedShares;

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
        `Successfully purchased ${shares} shares for ${formatCurrency(
          shares * stock.price
        )}`
      );
      setPurchaseAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purchase stock");
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
                <Building2 className="h-12 w-12 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-mono text-lg font-bold"
                    >
                      {stock.ticker}
                    </Badge>
                    {company.isPublic && (
                      <Badge variant="default">Public</Badge>
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

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left Column - Purchase Box */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Buy Shares
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBuyStock} className="space-y-4">
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
                        step={purchaseType === "shares" ? "1" : "0.01"}
                        min="0.01"
                        placeholder={
                          purchaseType === "shares" ? "100" : "1000.00"
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
                            Total Cost:
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
                      disabled={isSubmitting || !selectedAccount}
                      className="w-full"
                    >
                      {isSubmitting ? "Processing..." : "Buy Shares"}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
