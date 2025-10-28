"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CompanyLogo } from "~/components/ui/company-logo";
import { Sparkline } from "~/components/ui/sparkline";
import { formatCurrency } from "~/lib/game-utils";
import { useNavigate } from "react-router";
import { TrendingUp, TrendingDown, Search, Building2 } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/stocks";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

export default function StockMarketPage() {
  const navigate = useNavigate();

  // Get all stocks
  const allStocks = useQuery(api.stocks.getAllStocks);

  // Get all companies to display names
  const allCompanies = useQuery(api.companies.getAllPublicCompanies);

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "price-asc" | "price-desc" | "marketcap-asc" | "marketcap-desc" | "newest"
  >("marketcap-desc");

  // Get company details
  const getCompanyDetails = (companyId: Id<"companies">) => {
    const company = allCompanies?.find((c) => c._id === companyId);
    return {
      name: company?.name || "Unknown Company",
      logo: company?.logo,
    };
  };

  // Calculate price change percentage
  const calculatePriceChange = (stock: any) => {
    if (!stock.previousPrice || stock.previousPrice === 0) return 0;
    return ((stock.price - stock.previousPrice) / stock.previousPrice) * 100;
  };

  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    if (!allStocks) return [];

    let filtered = allStocks.filter((stock) => {
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      const company = allCompanies?.find((c) => c._id === stock.companyId);
      const matchesTicker = stock.ticker.toLowerCase().includes(query);
      const matchesName = company?.name.toLowerCase().includes(query);

      return matchesTicker || matchesName;
    });

    // Sort
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
  }, [allStocks, allCompanies, searchQuery, sortBy]);

  // Prepare a subset of stocks for sparkline (avoid too many server calls)
  const sparklineIds = useMemo(
    () => filteredStocks.slice(0, 24).map((s) => s._id),
    [filteredStocks]
  );

  const sparklineData = useQuery(
    api.stocks.getStocksPriceHistory1H,
    sparklineIds.length
      ? { stockIds: sparklineIds, points: 60 }
      : ("skip" as const)
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Modern Header */}
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary/70 bg-clip-text text-transparent">
                Stocks
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Discover, compare, and trade public companies with real-time
                updates.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    className="pl-9"
                    placeholder="Search by ticker or company name..."
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
                    <SelectItem value="price-desc">
                      Price: High to Low
                    </SelectItem>
                    <SelectItem value="price-asc">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stocks Grid */}
          {!allStocks ? (
            <p className="text-sm text-muted-foreground">Loading stocks...</p>
          ) : filteredStocks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No stocks found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search"
                    : "No companies have gone public yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredStocks.map((stock) => {
                const priceChange = calculatePriceChange(stock);
                const isPositive = priceChange >= 0;
                const company = getCompanyDetails(stock.companyId);
                const series = (sparklineData as any)?.[stock._id] as
                  | { timestamp: number; price: number }[]
                  | undefined;
                const seriesPositive =
                  series && series.length > 1
                    ? series[series.length - 1].price - series[0].price >= 0
                    : isPositive;

                return (
                  <Card
                    key={stock._id}
                    className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] border-border/70"
                    onClick={() => navigate(`/stock/${stock.companyId}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <CompanyLogo
                            src={company.logo}
                            alt={company.name}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="font-mono text-sm font-semibold"
                              >
                                {stock.ticker}
                              </Badge>
                              {stock.previousPrice ? (
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
                              {company.name}
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
                            {formatCurrency(stock.price)}
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
                            {formatCurrency(stock.marketCap || 0)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Total Shares
                          </p>
                          <p className="text-sm font-medium">
                            {stock.totalShares.toLocaleString()}
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
