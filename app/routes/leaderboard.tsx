"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useAuth } from "@clerk/react-router";
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
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency, formatCompactCurrency } from "~/lib/game-utils";
import { UserAvatar } from "~/components/ui/user-avatar";
import { CompanyLogo } from "~/components/ui/company-logo";
import { Search, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/leaderboard";
import { cn } from "~/lib/utils";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
};

export default function LeaderboardPage() {
  const { userId: clerkUserId } = useAuth();
  const upsertUser = useMutation(api.users.upsertUser);

  const [searchQuery, setSearchQuery] = useState("");
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [playerSort, setPlayerSort] = useState<SortConfig>({
    key: "netWorth",
    direction: "desc",
  });
  const [companySort, setCompanySort] = useState<SortConfig>({
    key: "marketCap",
    direction: "desc",
  });
  const [productSort, setProductSort] = useState<SortConfig>({
    key: "totalRevenue",
    direction: "desc",
  });

  // Sync user data (including profile picture) when component mounts
  useEffect(() => {
    if (clerkUserId) {
      upsertUser().catch(console.error);
    }
  }, [clerkUserId, upsertUser]);

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

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    if (!allPlayers?.players) return [];
    let filtered = allPlayers.players;
    if (playerSearchQuery) {
      filtered = filtered.filter((p) =>
        p.userName?.toLowerCase().includes(playerSearchQuery.toLowerCase())
      );
    }

    // Sort players
    return filtered.sort((a, b) => {
      let aVal: number | undefined;
      let bVal: number | undefined;

      switch (playerSort.key) {
        case "netWorth":
          aVal = a.netWorth;
          bVal = b.netWorth;
          break;
        case "balance":
          aVal = a.balance;
          bVal = b.balance;
          break;
        default:
          aVal = a.netWorth;
          bVal = b.netWorth;
      }

      if (playerSort.direction === "asc") {
        return (aVal || 0) - (bVal || 0);
      } else {
        return (bVal || 0) - (aVal || 0);
      }
    });
  }, [allPlayers, playerSearchQuery, playerSort]);

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    if (!allCompanies?.companies) return [];
    let filtered = allCompanies.companies;
    if (companySearchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
          c.ticker?.toLowerCase().includes(companySearchQuery.toLowerCase())
      );
    }

    // Sort companies
    return filtered.sort((a, b) => {
      let aVal: number | undefined;
      let bVal: number | undefined;

      switch (companySort.key) {
        case "marketCap":
          aVal = a.marketCap;
          bVal = b.marketCap;
          break;
        case "balance":
          aVal = a.balance;
          bVal = b.balance;
          break;
        case "name":
          return companySort.direction === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        default:
          aVal = a.marketCap;
          bVal = b.marketCap;
      }

      if (companySort.direction === "asc") {
        return (aVal || 0) - (bVal || 0);
      } else {
        return (bVal || 0) - (aVal || 0);
      }
    });
  }, [allCompanies, companySearchQuery, companySort]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!allProducts?.products) return [];
    let filtered = allProducts.products;
    if (productSearchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
          p.companyName
            ?.toLowerCase()
            .includes(productSearchQuery.toLowerCase())
      );
    }

    // Sort products
    return filtered.sort((a, b) => {
      let aVal: number | string | undefined;
      let bVal: number | string | undefined;

      switch (productSort.key) {
        case "totalRevenue":
          aVal = a.totalRevenue;
          bVal = b.totalRevenue;
          break;
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        case "name":
          return productSort.direction === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        default:
          aVal = a.totalRevenue;
          bVal = b.totalRevenue;
      }

      if (productSort.direction === "asc") {
        return (aVal as number) - (bVal as number);
      } else {
        return (bVal as number) - (aVal as number);
      }
    });
  }, [allProducts, productSearchQuery, productSort]);

  const toggleSort = (key: string, currentSort: SortConfig): SortConfig => {
    if (currentSort.key === key) {
      return {
        key,
        direction: currentSort.direction === "asc" ? "desc" : "asc",
      };
    }
    return { key, direction: "desc" };
  };

  const SortableHeader = ({
    children,
    sortKey,
    currentSort,
    onSort,
  }: {
    children: React.ReactNode;
    sortKey: string;
    currentSort: SortConfig;
    onSort: (newSort: SortConfig) => void;
  }) => {
    const isActive = currentSort.key === sortKey;
    return (
      <TableHead
        onClick={() => onSort(toggleSort(sortKey, currentSort))}
        className="cursor-pointer hover:bg-muted/50 select-none"
      >
        <div className="flex items-center gap-1">
          {children}
          <ArrowUpDown
            className={cn(
              "h-4 w-4",
              isActive
                ? currentSort.direction === "asc"
                  ? "rotate-180"
                  : "rotate-0"
                : "opacity-0"
            )}
          />
        </div>
      </TableHead>
    );
  };

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
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-6 w-6 rounded-full" />
                              <Skeleton className="h-8 w-8 rounded-full" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                            <Skeleton className="h-4 w-20" />
                          </div>
                        ))}
                      </div>
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
                              <UserAvatar
                                src={player.userImage}
                                alt={player.userName}
                                size="sm"
                              />
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
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-6 w-6 rounded-full" />
                              <Skeleton className="h-8 w-8 rounded-full" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                            <Skeleton className="h-4 w-20" />
                          </div>
                        ))}
                      </div>
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
                              <UserAvatar
                                src={player.userImage}
                                alt={player.userName}
                                size="sm"
                              />
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
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-6 w-6 rounded-full" />
                              <Skeleton className="h-8 w-8 rounded-lg" />
                              <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </div>
                            <Skeleton className="h-4 w-20" />
                          </div>
                        ))}
                      </div>
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
                              <CompanyLogo
                                src={company.logo}
                                alt={company.name}
                                size="sm"
                              />
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
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-6 w-6 rounded-full" />
                              <Skeleton className="h-8 w-8 rounded-lg" />
                              <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </div>
                            <Skeleton className="h-4 w-20" />
                          </div>
                        ))}
                      </div>
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
                              <CompanyLogo
                                src={company.logo}
                                alt={company.name}
                                size="sm"
                              />
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
                      <SortableHeader
                        sortKey="balance"
                        currentSort={playerSort}
                        onSort={setPlayerSort}
                      >
                        Balance
                      </SortableHeader>
                      <SortableHeader
                        sortKey="netWorth"
                        currentSort={playerSort}
                        onSort={setPlayerSort}
                      >
                        Net Worth
                      </SortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!allPlayers ? (
                      <>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-4 w-8" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-4 w-32" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
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
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserAvatar
                                src={player.userImage}
                                alt={player.userName}
                                size="sm"
                              />
                              {player.userName}
                            </div>
                          </TableCell>
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
                      <SortableHeader
                        sortKey="marketCap"
                        currentSort={companySort}
                        onSort={setCompanySort}
                      >
                        Market Cap
                      </SortableHeader>
                      <SortableHeader
                        sortKey="balance"
                        currentSort={companySort}
                        onSort={setCompanySort}
                      >
                        Balance
                      </SortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!allCompanies ? (
                      <>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-4 w-8" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-8 rounded-lg" />
                                <Skeleton className="h-4 w-32" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-16" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
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
                            <div className="flex items-center gap-2">
                              <CompanyLogo
                                src={company.logo}
                                alt={company.name}
                                size="sm"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {company.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Owner: {company.ownerName}
                                </span>
                              </div>
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
                      <SortableHeader
                        sortKey="totalRevenue"
                        currentSort={productSort}
                        onSort={setProductSort}
                      >
                        Total Revenue
                      </SortableHeader>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!allProducts ? (
                      <>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-4 w-8" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-40" />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-6 rounded-lg" />
                                <Skeleton className="h-4 w-32" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="h-4 w-16 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
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
                            <div className="flex items-center gap-2">
                              <CompanyLogo
                                src={product.companyLogo}
                                alt={product.companyName}
                                size="xs"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {product.companyName}
                                </span>
                                <span className="text-xs font-mono text-muted-foreground">
                                  {product.ticker}
                                </span>
                              </div>
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
