"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatCurrency } from "~/lib/game-utils";
import {
  TrendingUp,
  TrendingDown,
  Search,
  Coins,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  DollarSign,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/crypto";
import { toast } from "sonner";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    throw redirect("/sign-in");
  }
  return {};
}

export default function CryptoPage() {
  // Queries
  const allCryptos = useQuery(api.crypto.getAllCryptos);
  const myPortfolio = useQuery(api.crypto.getMyPortfolio);
  const marketStats = useQuery(api.crypto.getMarketStats);
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);

  // Mutations
  const buyCrypto = useMutation(api.crypto.buyCrypto);
  const sellCrypto = useMutation(api.crypto.sellCrypto);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "price-asc" | "price-desc" | "marketcap-desc" | "change-desc"
  >("marketcap-desc");
  const [selectedCrypto, setSelectedCrypto] = useState<any>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState("");

  // Filter and sort cryptos
  const filteredCryptos = useMemo(() => {
    if (!allCryptos) return [];

    let filtered = allCryptos.filter((crypto) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        crypto.name.toLowerCase().includes(query) ||
        crypto.symbol.toLowerCase().includes(query)
      );
    });

    // Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "marketcap-desc":
        filtered.sort((a, b) => b.marketCap - a.marketCap);
        break;
      case "change-desc":
        filtered.sort((a, b) => b.lastPriceChange - a.lastPriceChange);
        break;
    }

    return filtered;
  }, [allCryptos, searchQuery, sortBy]);

  // Calculate portfolio total
  const portfolioTotal = useMemo(() => {
    if (!myPortfolio) return 0;
    return myPortfolio.reduce((sum, item) => sum + item.currentValue, 0);
  }, [myPortfolio]);

  const handleTrade = async () => {
    if (!selectedCrypto || !tradeAmount) return;

    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      if (tradeType === "buy") {
        const result = await buyCrypto({
          cryptoId: selectedCrypto._id,
          amount: amount,
        });
        toast.success(
          `Bought ${amount} ${selectedCrypto.symbol} for ${formatCurrency(
            result.totalCost
          )}`
        );
      } else {
        const result = await sellCrypto({
          cryptoId: selectedCrypto._id,
          amount: amount,
        });
        toast.success(
          `Sold ${amount} ${selectedCrypto.symbol} for ${formatCurrency(
            result.totalRevenue
          )}`
        );
      }
      setTradeDialogOpen(false);
      setTradeAmount("");
    } catch (error: any) {
      toast.error(error.message || "Trade failed");
    }
  };

  const openTradeDialog = (crypto: any, type: "buy" | "sell") => {
    setSelectedCrypto(crypto);
    setTradeType(type);
    setTradeDialogOpen(true);
  };

  const getWalletBalance = (cryptoId: Id<"cryptocurrencies">) => {
    const wallet = myPortfolio?.find((w) => w.cryptoId === cryptoId);
    return wallet?.balance || 0;
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary/70 bg-clip-text text-transparent">
                Cryptocurrency Market
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Trade digital currencies with real-time market dynamics and
                volatility.
              </p>
            </div>

            {/* Market Stats */}
            {marketStats && (
              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Market Cap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(marketStats.totalMarketCap)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      24h Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(marketStats.totalVolume24h)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cryptocurrencies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {marketStats.cryptoCount}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <Tabs defaultValue="market" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="market">
                <Activity className="mr-2 h-4 w-4" />
                Market
              </TabsTrigger>
              <TabsTrigger value="portfolio">
                <Wallet className="mr-2 h-4 w-4" />
                My Portfolio
              </TabsTrigger>
            </TabsList>

            {/* Market Tab */}
            <TabsContent value="market" className="space-y-4">
              {/* Search and Sort */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search cryptocurrencies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Select
                    value={sortBy}
                    onValueChange={(value: any) => setSortBy(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketcap-desc">
                        Market Cap (High to Low)
                      </SelectItem>
                      <SelectItem value="price-desc">
                        Price (High to Low)
                      </SelectItem>
                      <SelectItem value="price-asc">
                        Price (Low to High)
                      </SelectItem>
                      <SelectItem value="change-desc">
                        Biggest Movers
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Crypto List */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCryptos.map((crypto) => {
                  const priceChange = crypto.lastPriceChange * 100;
                  const isPositive = priceChange >= 0;
                  const walletBalance = getWalletBalance(crypto._id);

                  return (
                    <Card
                      key={crypto._id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                              <Coins className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {crypto.symbol}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {crypto.name}
                              </p>
                            </div>
                          </div>
                          {priceChange !== 0 && (
                            <Badge
                              variant={isPositive ? "default" : "destructive"}
                            >
                              {isPositive ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              )}
                              {isPositive ? "+" : ""}
                              {priceChange.toFixed(2)}%
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-2xl font-bold">
                            {formatCurrency(crypto.currentPrice)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Market Cap: {formatCurrency(crypto.marketCap)}
                          </div>
                          {walletBalance > 0 && (
                            <div className="text-xs text-primary font-medium">
                              You own: {walletBalance.toLocaleString()}{" "}
                              {crypto.symbol}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openTradeDialog(crypto, "buy")}
                            className="flex-1"
                            size="sm"
                          >
                            <ArrowUpRight className="mr-1 h-4 w-4" />
                            Buy
                          </Button>
                          <Button
                            onClick={() => openTradeDialog(crypto, "sell")}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                            disabled={walletBalance === 0}
                          >
                            <ArrowDownRight className="mr-1 h-4 w-4" />
                            Sell
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredCryptos.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Coins className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">
                      No cryptocurrencies found
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {searchQuery
                        ? "Try adjusting your search query"
                        : "No cryptocurrencies available yet"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Portfolio Tab */}
            <TabsContent value="portfolio" className="space-y-4">
              {/* Portfolio Summary */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                <CardHeader>
                  <CardTitle>Total Portfolio Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(portfolioTotal)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Across {myPortfolio?.length || 0} cryptocurrencies
                  </p>
                </CardContent>
              </Card>

              {/* Holdings */}
              <div className="space-y-3">
                {myPortfolio && myPortfolio.length > 0 ? (
                  myPortfolio.map((holding) => {
                    if (!holding.crypto) return null;
                    const crypto = holding.crypto;
                    const isProfitable = holding.profitLoss >= 0;

                    return (
                      <Card key={holding._id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <Coins className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {crypto.symbol}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {holding.balance.toLocaleString()} coins
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {formatCurrency(holding.currentValue)}
                              </div>
                              <div
                                className={`text-sm ${
                                  isProfitable
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {isProfitable ? "+" : ""}
                                {formatCurrency(holding.profitLoss)} (
                                {holding.profitLossPercent.toFixed(2)}%)
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <div>
                              <div>Avg. Cost</div>
                              <div className="font-medium text-foreground">
                                {formatCurrency(holding.averagePurchasePrice)}
                              </div>
                            </div>
                            <div>
                              <div>Current Price</div>
                              <div className="font-medium text-foreground">
                                {formatCurrency(crypto.currentPrice)}
                              </div>
                            </div>
                            <div>
                              <div>Invested</div>
                              <div className="font-medium text-foreground">
                                {formatCurrency(holding.totalInvested)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              onClick={() => openTradeDialog(crypto, "buy")}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Buy More
                            </Button>
                            <Button
                              onClick={() => openTradeDialog(crypto, "sell")}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Sell
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-medium">
                        No Holdings Yet
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Start trading cryptocurrencies to build your portfolio
                      </p>
                      <Button
                        onClick={() =>
                          document
                            .querySelector('[value="market"]')
                            ?.dispatchEvent(
                              new Event("click", { bubbles: true })
                            )
                        }
                        className="mt-4"
                      >
                        Explore Market
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Trade Dialog */}
      <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tradeType === "buy" ? "Buy" : "Sell"} {selectedCrypto?.symbol}
            </DialogTitle>
            <DialogDescription>
              {tradeType === "buy"
                ? `Purchase ${selectedCrypto?.name} at current market price`
                : `Sell your ${selectedCrypto?.name} holdings`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Price</Label>
              <div className="text-2xl font-bold">
                {selectedCrypto && formatCurrency(selectedCrypto.currentPrice)}
              </div>
            </div>
            {tradeType === "sell" && (
              <div>
                <Label>Your Balance</Label>
                <div className="text-lg font-semibold">
                  {selectedCrypto &&
                    getWalletBalance(selectedCrypto._id).toLocaleString()}{" "}
                  {selectedCrypto?.symbol}
                </div>
              </div>
            )}
            {tradeType === "buy" && currentPlayer && (
              <div>
                <Label>Your Balance</Label>
                <div className="text-lg font-semibold">
                  {formatCurrency(currentPlayer.balance)}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="amount">Amount ({selectedCrypto?.symbol})</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            {tradeAmount && selectedCrypto && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between text-sm">
                  <span>Estimated Total</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      parseFloat(tradeAmount || "0") *
                        selectedCrypto.currentPrice
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Price impact may apply for large orders
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTrade} disabled={!tradeAmount}>
              {tradeType === "buy" ? "Buy" : "Sell"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
