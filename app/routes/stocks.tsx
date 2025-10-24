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
import { formatCurrency } from "~/lib/game-utils";
import { useNavigate } from "react-router";
import { TrendingUp, TrendingDown, Search, Building2 } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

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

  // Get company name
  const getCompanyName = (companyId: Id<"companies">) => {
    const company = allCompanies?.find((c) => c._id === companyId);
    return company?.name || "Unknown Company";
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

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Market</h1>
            <p className="text-muted-foreground">
              Browse and trade stocks from public companies
            </p>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Sort
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by ticker or company name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort">Sort by</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(value: any) => setSortBy(value)}
                  >
                    <SelectTrigger id="sort">
                      <SelectValue />
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
            </CardContent>
          </Card>

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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStocks.map((stock) => {
                const priceChange = calculatePriceChange(stock);
                const isPositive = priceChange >= 0;

                return (
                  <Card
                    key={stock._id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                    onClick={() => navigate(`/stock/${stock.companyId}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-lg font-bold"
                            >
                              {stock.ticker}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getCompanyName(stock.companyId)}
                          </p>
                        </div>
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Current Price */}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Current Price
                        </p>
                        <p className="text-3xl font-bold text-green-600">
                          {formatCurrency(stock.price)}
                        </p>
                      </div>

                      {/* Price Change */}
                      {stock.previousPrice && (
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span
                            className={`text-sm font-semibold ${
                              isPositive ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {priceChange.toFixed(2)}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({isPositive ? "+" : ""}
                            {formatCurrency(stock.price - stock.previousPrice)})
                          </span>
                        </div>
                      )}

                      {/* Market Cap */}
                      <div className="border-t pt-3">
                        <p className="text-sm text-muted-foreground">
                          Market Cap
                        </p>
                        <p className="text-lg font-semibold text-purple-600">
                          {formatCurrency(stock.marketCap || 0)}
                        </p>
                      </div>

                      {/* Total Shares */}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Shares
                        </p>
                        <p className="text-sm font-medium">
                          {stock.totalShares.toLocaleString()}
                        </p>
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
