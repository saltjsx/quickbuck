"use client";

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import { TrendingUp, TrendingDown, Plus, Coins, Search } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/crypto";
import { CompanyLogo } from "~/components/ui/company-logo";
import { Sparkline } from "~/components/ui/sparkline";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

export default function CryptoMarketPage() {
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

  // Get all cryptocurrencies
  const allCryptos = useQuery(api.crypto.getAllCryptocurrencies);

  // Create crypto mutation
  const createCrypto = useMutation(api.crypto.createCryptocurrency);

  // Search and sort state (match stocks page options)
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "price-asc" | "price-desc" | "marketcap-asc" | "marketcap-desc" | "newest"
  >("marketcap-desc");

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    ticker: "",
    description: "",
    image: "",
  });
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Validate ticker format - letters only, 3-6 characters
  const validateTicker = (ticker: string): boolean => {
    const tickerRegex = /^[A-Z]{3,6}$/;
    return tickerRegex.test(ticker.toUpperCase());
  };

  // Handle create cryptocurrency
  const handleCreateCrypto = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!player) {
      setCreateError("Player not found");
      return;
    }

    // Validate ticker format
    const upperTicker = createForm.ticker.toUpperCase();
    if (!validateTicker(upperTicker)) {
      setCreateError("Ticker must be 3-6 letters (e.g., BTC, ETH, SOL)");
      return;
    }

    // Check balance
    if (player.balance < 1000000) {
      // $10,000 in cents
      setCreateError(
        "Insufficient balance. Creating a cryptocurrency costs $10,000"
      );
      return;
    }

    setIsCreating(true);
    try {
      const cryptoId = await createCrypto({
        creatorId: player._id,
        name: createForm.name,
        ticker: upperTicker,
        description: createForm.description,
        image: createForm.image.trim() || undefined,
      });

      setIsCreateModalOpen(false);
      setCreateForm({ name: "", ticker: "", description: "", image: "" });

      // Navigate to the new crypto detail page
      navigate(`/crypto/${cryptoId}`);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create cryptocurrency"
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Filter and sort cryptos
  const filteredCryptos = useMemo(() => {
    if (!allCryptos) return [];

    let filtered = allCryptos.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      );
    });

    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "marketcap-asc":
        filtered.sort((a, b) => (a.marketCap || 0) - (b.marketCap || 0));
        break;
      case "marketcap-desc":
        filtered.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
        break;
      case "newest":
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return filtered;
  }, [allCryptos, searchQuery, sortBy]);

  // Prepare sparkline ids (limit to 24 to reduce load)
  const sparklineIds = useMemo(
    () => filteredCryptos.slice(0, 24).map((c) => c._id),
    [filteredCryptos]
  );

  // Batch query 1h history for sparklines (cast to any to avoid codegen timing)
  const sparklineData = useQuery(
    (api as any).crypto.getCryptosPriceHistory1H,
    sparklineIds.length
      ? { cryptoIds: sparklineIds, points: 60 }
      : ("skip" as const)
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Modern Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary/70 bg-clip-text text-transparent">
                Crypto
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Discover, compare, and trade community coins with real-time
                updates.
              </p>
            </div>
            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Crypto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Cryptocurrency</DialogTitle>
                  <DialogDescription>
                    Create your own cryptocurrency for $10,000 with a starting
                    market cap of $10,000 and 1,000,000 total coins. You must
                    purchase coins yourself to have any holdings.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCrypto} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Bitcoin"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticker">Ticker * (3-6 letters)</Label>
                    <Input
                      id="ticker"
                      placeholder="BTC"
                      value={createForm.ticker}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          ticker: e.target.value.toUpperCase(),
                        })
                      }
                      maxLength={6}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Examples: BTC, ETH, SOL
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="A revolutionary new cryptocurrency..."
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Logo URL (optional)</Label>
                    <Input
                      id="image"
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={createForm.image}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          image: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">
                      Cost: {formatCurrency(1000000)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your balance: {formatCurrency(player?.balance || 0)}
                    </p>
                  </div>

                  {createError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {createError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="flex-1"
                    >
                      {isCreating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Sort */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  className="pl-9"
                  placeholder="Search by ticker or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger id="sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketcap-desc">
                    Market Cap: High to Low
                  </SelectItem>
                  <SelectItem value="marketcap-asc">
                    Market Cap: Low to High
                  </SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Crypto Grid */}
          {!allCryptos ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">
                Loading cryptocurrencies...
              </p>
            </div>
          ) : filteredCryptos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Coins className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No cryptocurrencies found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "Be the first to create one!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCryptos.map((crypto) => {
                const priceChange = crypto.previousPrice
                  ? ((crypto.price - crypto.previousPrice) /
                      crypto.previousPrice) *
                    100
                  : 0;
                const isPositive = priceChange >= 0;
                const series = (sparklineData as any)?.[crypto._id] as
                  | { timestamp: number; price: number }[]
                  | undefined;
                const seriesPositive =
                  series && series.length > 1
                    ? series[series.length - 1].price - series[0].price >= 0
                    : isPositive;

                return (
                  <Card
                    key={crypto._id}
                    className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] border-border/70"
                    onClick={() => navigate(`/crypto/${crypto._id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <CompanyLogo
                            src={(crypto as any).image}
                            alt={crypto.name}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="font-mono text-sm font-semibold"
                              >
                                {crypto.ticker}
                              </Badge>
                              {crypto.previousPrice ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                    isPositive
                                      ? "bg-green-500/10 text-green-600"
                                      : "bg-red-500/10 text-red-600"
                                  }`}
                                >
                                  {isPositive ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {isPositive ? "+" : ""}
                                  {priceChange.toFixed(2)}%
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {crypto.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p
                            className={`text-xl font-bold ${
                              isPositive ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(crypto.price)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Sparkline */}
                      <div className="rounded-md border bg-muted/30 p-2 transition-colors group-hover:bg-muted/50">
                        <Sparkline
                          data={series}
                          positive={seriesPositive}
                          height={54}
                        />
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            1h preview
                          </span>
                          {series && series.length > 1 ? (
                            <span
                              className={`text-xs font-medium ${
                                seriesPositive
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {seriesPositive ? "+" : ""}
                              {(
                                ((series[series.length - 1].price -
                                  series[0].price) /
                                  series[0].price) *
                                100
                              ).toFixed(2)}
                              %
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Market Cap
                          </p>
                          <p className="text-sm font-semibold text-purple-600">
                            {formatCurrency(crypto.marketCap || 0)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Circulating
                          </p>
                          <p className="text-sm font-medium">
                            {(crypto.circulatingSupply || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
