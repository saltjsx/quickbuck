"use client";

import { useState } from "react";
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
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Coins,
  Search,
  ArrowUpDown,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/crypto";

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

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "marketCap" | "change">(
    "marketCap"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  // Validate ticker format (*XXX where X is letter, max 3 chars after *)
  const validateTicker = (ticker: string): boolean => {
    const tickerRegex = /^\*[A-Z]{1,3}$/;
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
      setCreateError("Ticker must be in format *XXX (e.g., *BTC, *ETH, *SOL)");
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
  const filteredAndSortedCryptos = allCryptos
    ? allCryptos
        .filter((crypto) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            crypto.name.toLowerCase().includes(query) ||
            crypto.ticker.toLowerCase().includes(query)
          );
        })
        .sort((a, b) => {
          let comparison = 0;
          switch (sortBy) {
            case "price":
              comparison = a.price - b.price;
              break;
            case "marketCap":
              comparison = a.marketCap - b.marketCap;
              break;
            case "change": {
              const aChange = a.previousPrice
                ? ((a.price - a.previousPrice) / a.previousPrice) * 100
                : 0;
              const bChange = b.previousPrice
                ? ((b.price - b.previousPrice) / b.previousPrice) * 100
                : 0;
              comparison = aChange - bChange;
              break;
            }
          }
          return sortOrder === "asc" ? comparison : -comparison;
        })
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Crypto Market
              </h1>
              <p className="text-muted-foreground">
                Trade cryptocurrencies or create your own
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
                    <Label htmlFor="ticker">
                      Ticker * (format: *XXX, max 3 letters after *)
                    </Label>
                    <Input
                      id="ticker"
                      placeholder="*BTC"
                      value={createForm.ticker}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          ticker: e.target.value.toUpperCase(),
                        })
                      }
                      maxLength={4}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Examples: *BTC, *ETH, *SOL
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
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketCap">Market Cap</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="change">Change %</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </div>

          {/* Crypto Cards */}
          {!allCryptos ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">
                Loading cryptocurrencies...
              </p>
            </div>
          ) : filteredAndSortedCryptos.length === 0 ? (
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedCryptos.map((crypto) => {
                const priceChange = crypto.previousPrice
                  ? ((crypto.price - crypto.previousPrice) /
                      crypto.previousPrice) *
                    100
                  : 0;
                const isPositive = priceChange >= 0;

                return (
                  <Card
                    key={crypto._id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                    onClick={() => navigate(`/crypto/${crypto._id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-primary/10 p-2">
                            <Coins className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {crypto.ticker}
                            </Badge>
                            <CardTitle className="text-base mt-1">
                              {crypto.name}
                            </CardTitle>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(crypto.price)}
                          </span>
                          {crypto.previousPrice && (
                            <div className="flex items-center gap-1">
                              {isPositive ? (
                                <TrendingUp className="h-3 w-3 text-green-600" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-600" />
                              )}
                              <span
                                className={`text-sm font-semibold ${
                                  isPositive ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {isPositive ? "+" : ""}
                                {priceChange.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Market Cap
                          </span>
                          <span className="font-medium">
                            {formatCurrency(crypto.marketCap)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Volume (24h)
                          </span>
                          <span className="font-medium">
                            {formatCurrency(crypto.volume)}
                          </span>
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
