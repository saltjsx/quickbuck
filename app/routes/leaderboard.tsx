"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatCurrency, formatCompactCurrency } from "~/lib/game-utils";
import { Search, TrendingUp, TrendingDown } from "lucide-react";

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Fetch top 5 data
  const topPlayersByBalance = useQuery(api.leaderboard.getTopPlayersByBalance, {
    limit: 5,
  });
  const topPlayersByNetWorth = useQuery(
    api.leaderboard.getTopPlayersByNetWorth,
    { limit: 5 }
  );
  const topCompaniesByMarketCap = useQuery(
    api.leaderboard.getTopCompaniesByMarketCap,
    { limit: 5 }
  );
  const topCompaniesByBalance = useQuery(
    api.leaderboard.getTopCompaniesByBalance,
    { limit: 5 }
  );

  // Fetch all data
  const allPlayers = useQuery(api.leaderboard.getAllPlayersSorted, {
    sortBy: "netWorth",
    limit: 100,
  });
  const allCompanies = useQuery(api.leaderboard.getAllCompaniesSorted, {
    sortBy: "marketCap",
    limit: 100,
  });
  const allProducts = useQuery(api.leaderboard.getAllProductsSorted, {
    limit: 100,
  });

  // Filter data based on search
  const filteredPlayers = useMemo(() => {
    if (!allPlayers?.players) return [];
    if (!playerSearchQuery) return allPlayers.players;
    return allPlayers.players.filter((p) =>
      p.userName?.toLowerCase().includes(playerSearchQuery.toLowerCase())
    );
  }, [allPlayers, playerSearchQuery]);

  const filteredCompanies = useMemo(() => {
    if (!allCompanies?.companies) return [];
    if (!companySearchQuery) return allCompanies.companies;
    return allCompanies.companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
        c.ticker?.toLowerCase().includes(companySearchQuery.toLowerCase())
    );
  }, [allCompanies, companySearchQuery]);

  const filteredProducts = useMemo(() => {
    if (!allProducts?.products) return [];
    if (!productSearchQuery) return allProducts.products;
    return allProducts.products.filter(
      (p) =>
        p.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        p.companyName?.toLowerCase().includes(productSearchQuery.toLowerCase())
    );
  }, [allProducts, productSearchQuery]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground">
              See how you stack up against other players and companies.
            </p>
          </div>

          {/* Top 5 Sections */}
          <Tabs defaultValue="tops" className="w-full">
            <TabsList>
              <TabsTrigger value="tops">Top Players & Companies</TabsTrigger>
              <TabsTrigger value="players">All Players</TabsTrigger>
              <TabsTrigger value="companies">All Companies</TabsTrigger>
              <TabsTrigger value="products">All Products</TabsTrigger>
            </TabsList>

            <TabsContent value="tops" className="space-y-4">
              {/* Top 5 Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Top 5 Players by Balance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Top 5 Players by Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!topPlayersByBalance ? (
                      <p className="text-sm text-muted-foreground">
                        Loading...
                      </p>
                    ) : topPlayersByBalance.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No players yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {topPlayersByBalance.map((player, index) => (
                          <div
                            key={player._id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium">
                                {player.userName}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-green-600">
                              {formatCompactCurrency(player.balance)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top 5 Players by Net Worth */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Top 5 Players by Net Worth
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!topPlayersByNetWorth ? (
                      <p className="text-sm text-muted-foreground">
                        Loading...
                      </p>
                    ) : topPlayersByNetWorth.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No players yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {topPlayersByNetWorth.map((player, index) => (
                          <div
                            key={player._id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium">
                                {player.userName}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-blue-600">
                              {formatCompactCurrency(player.netWorth)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top 5 Companies by Market Cap */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Top 5 Companies by Market Cap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!topCompaniesByMarketCap ? (
                      <p className="text-sm text-muted-foreground">
                        Loading...
                      </p>
                    ) : topCompaniesByMarketCap.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No public companies yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {topCompaniesByMarketCap.map((company, index) => (
                          <div
                            key={company._id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {index + 1}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {company.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {company.ticker}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-purple-600">
                              {formatCompactCurrency(company.marketCap || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top 5 Companies by Cash */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Top 5 Companies by Cash
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!topCompaniesByBalance ? (
                      <p className="text-sm text-muted-foreground">
                        Loading...
                      </p>
                    ) : topCompaniesByBalance.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No companies yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {topCompaniesByBalance.map((company, index) => (
                          <div
                            key={company._id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {index + 1}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {company.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {company.ticker || "Private"}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-green-600">
                              {formatCompactCurrency(company.balance)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="players" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search players..."
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Net Worth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!allPlayers ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          Loading players...
                        </TableCell>
                      </TableRow>
                    ) : filteredPlayers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          No players found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPlayers.map((player, index) => (
                        <TableRow key={player._id}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>{player.userName}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(player.balance)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-600">
                            {formatCurrency(player.netWorth)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="companies" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search companies..."
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead className="text-right">Market Cap</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!allCompanies ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          Loading companies...
                        </TableCell>
                      </TableRow>
                    ) : filteredCompanies.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No companies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCompanies.map((company, index) => (
                        <TableRow key={company._id}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {company.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Owner: {company.ownerName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {company.ticker || "N/A"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-purple-600">
                            {formatCurrency(company.marketCap || 0)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(company.balance)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">
                        Total Revenue
                      </TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!allProducts ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          Loading products...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product, index) => (
                        <TableRow key={product._id}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {product.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ${product.price?.toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {product.companyName}
                              </span>
                              <span className="text-xs font-mono text-muted-foreground">
                                {product.ticker}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(product.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.stock || 0}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
