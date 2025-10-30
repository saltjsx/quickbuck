"use client";

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { CompanyLogo } from "~/components/ui/company-logo";
import { UserAvatar } from "~/components/ui/user-avatar";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import { Building2, Coins, ShoppingBag, ArrowUpDown } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/portfolio";
import { NetWorthBreakdownModern } from "~/components/dashboard/modern/net-worth-breakdown-modern";
import { AnimatedNumber } from "~/components/ui/animated-number";

type SortField = "value" | "amount" | "name";
type SortOrder = "asc" | "desc";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

export default function PortfolioPage() {
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

  // Get player balance and net worth (for KPI cards)
  const balance = useQuery(
    api.players.getPlayerBalance,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get player's companies to compute equity
  const playerCompanies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get stock holdings
  const stockHoldings = useQuery(
    api.stocks.getPlayerStockHoldings,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get crypto holdings
  const cryptoHoldings = useQuery(
    api.portfolio.getUserCryptoHoldings,
    player?._id ? { userId: player._id } : "skip"
  );

  // Get player inventory (marketplace items)
  const playerInventory = useQuery(
    api.products.getPlayerInventory,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Sorting state
  const [stockSort, setStockSort] = useState<{
    field: SortField;
    order: SortOrder;
  }>({
    field: "value",
    order: "desc",
  });
  const [cryptoSort, setCryptoSort] = useState<{
    field: SortField;
    order: SortOrder;
  }>({
    field: "value",
    order: "desc",
  });

  // Get all stocks at once to avoid hooks issues
  const allStocks = useQuery(api.stocks.getAllStocks, {});

  // Build stock details by matching holdings with stock data
  const stocksWithDetails =
    stockHoldings && allStocks
      ? stockHoldings
          .map((holding) => {
            const stock = allStocks.find((s) => s._id === holding.stockId);
            return { holding, stock };
          })
          .filter((item) => item.stock)
      : [];

  // Build crypto details - already enriched from getUserCryptoHoldings
  const cryptoWithDetails = cryptoHoldings
    ? cryptoHoldings.map((holding) => ({
        holding,
        crypto: holding.crypto,
      }))
    : [];

  // Calculate totals
  const totalStocksValue =
    stocksWithDetails.reduce(
      (sum, item) =>
        sum + (item.stock ? item.holding.shares * item.stock.price : 0),
      0
    ) || 0;

  const totalCryptoValue =
    cryptoWithDetails.reduce(
      (sum, item) =>
        sum +
        (item.crypto
          ? Math.floor(item.holding.balance * item.crypto.currentPrice)
          : 0),
      0
    ) || 0;

  const totalBalance = balance ?? 0;
  const companyEquity =
    playerCompanies?.reduce(
      (sum, company) => sum + (company.balance + (company.marketCap ?? 0)),
      0
    ) ?? 0;

  const sortStocks = (data: typeof stocksWithDetails) => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      let comparison = 0;
      switch (stockSort.field) {
        case "value":
          comparison =
            (a.stock ? a.holding.shares * a.stock.price : 0) -
            (b.stock ? b.holding.shares * b.stock.price : 0);
          break;
        case "amount":
          comparison = a.holding.shares - b.holding.shares;
          break;
        case "name":
          comparison = (a.stock?.ticker || "").localeCompare(
            b.stock?.ticker || ""
          );
          break;
      }
      return stockSort.order === "asc" ? comparison : -comparison;
    });
  };

  const sortCrypto = (data: typeof cryptoWithDetails) => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      let comparison = 0;
      switch (cryptoSort.field) {
        case "value":
          comparison =
            (a.crypto
              ? Math.floor(a.holding.balance * a.crypto.currentPrice)
              : 0) -
            (b.crypto
              ? Math.floor(b.holding.balance * b.crypto.currentPrice)
              : 0);
          break;
        case "amount":
          comparison = a.holding.balance - b.holding.balance;
          break;
        case "name":
          comparison = (a.crypto?.name || "").localeCompare(
            b.crypto?.name || ""
          );
          break;
      }
      return cryptoSort.order === "asc" ? comparison : -comparison;
    });
  };

  const sortedStocks = sortStocks(stocksWithDetails);
  const sortedCrypto = sortCrypto(cryptoWithDetails);

  // Memoize P/L calculations for rows
  const stockRows = useMemo(() => {
    return sortedStocks.map((item) => {
      const value = item.stock ? item.holding.shares * item.stock.price : 0;
      const cost =
        item.holding.shares * (item.holding.averagePurchasePrice || 0);
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      return { ...item, value, cost, pnl, pnlPct };
    });
  }, [sortedStocks]);

  const cryptoRows = useMemo(() => {
    return sortedCrypto.map((item) => {
      const value = item.crypto
        ? Math.floor(item.holding.balance * item.crypto.currentPrice)
        : 0;
      const cost = Math.floor(
        item.holding.balance * (item.holding.averagePurchasePrice || 0)
      );
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      return { ...item, value, cost, pnl, pnlPct };
    });
  }, [sortedCrypto]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Page Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Portfolio
            </h1>
            <p className="text-sm text-muted-foreground">
              A clear overview of your assets, holdings, and allocations.
            </p>
          </div>

          {/* Removed large KPI cards to emphasize sections */}

          {/* Holdings Sections */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Stock Holdings</CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <div className="text-lg font-semibold text-foreground">
                      <AnimatedNumber
                        value={totalStocksValue}
                        compact={false}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!stocksWithDetails || stocksWithDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No stock holdings yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setStockSort({
                              field: "amount",
                              order:
                                stockSort.field === "amount" &&
                                stockSort.order === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                        >
                          <div className="flex items-center gap-1">
                            Shares
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>Avg Price</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setStockSort({
                              field: "value",
                              order:
                                stockSort.field === "value" &&
                                stockSort.order === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                        >
                          <div className="flex items-center gap-1">
                            Value
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="text-right">P/L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockRows.map((item) => (
                        <TableRow
                          key={item.holding._id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            item.stock &&
                            navigate(`/stock/${item.stock.companyId}`)
                          }
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {item.stock?.ticker}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Stock
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.holding.shares.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatCurrency(
                              item.holding.averagePurchasePrice || 0
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(item.value)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span
                              className={
                                item.pnl >= 0
                                  ? "text-green-600"
                                  : "text-red-500"
                              }
                            >
                              {item.pnl >= 0 ? "+" : "-"}
                              {formatCurrency(Math.abs(item.pnl))}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({item.pnlPct.toFixed(1)}%)
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={4}>Total</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(totalStocksValue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Crypto Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Crypto Holdings</CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <div className="text-lg font-semibold text-foreground">
                      <AnimatedNumber
                        value={totalCryptoValue}
                        compact={false}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!cryptoWithDetails || cryptoWithDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No crypto holdings yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setCryptoSort({
                              field: "amount",
                              order:
                                cryptoSort.field === "amount" &&
                                cryptoSort.order === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                        >
                          <div className="flex items-center gap-1">
                            Tokens
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead>Avg Price</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setCryptoSort({
                              field: "value",
                              order:
                                cryptoSort.field === "value" &&
                                cryptoSort.order === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                        >
                          <div className="flex items-center gap-1">
                            Value
                            <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </TableHead>
                        <TableHead className="text-right">P/L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cryptoRows.map((item) => (
                        <TableRow
                          key={item.holding._id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            item.crypto &&
                            navigate(`/crypto/${item.crypto._id}`)
                          }
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <span>{item.crypto?.name}</span>
                                <Badge variant="outline" className="font-mono">
                                  {item.crypto?.symbol}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.holding.balance.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatCurrency(
                              item.holding.averagePurchasePrice || 0
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(item.value)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span
                              className={
                                item.pnl >= 0
                                  ? "text-green-600"
                                  : "text-red-500"
                              }
                            >
                              {item.pnl >= 0 ? "+" : "-"}
                              {formatCurrency(Math.abs(item.pnl))}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({item.pnlPct.toFixed(1)}%)
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={4}>Total</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(totalCryptoValue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Net Worth Breakdown (now after holdings, with correct equity) */}
          <NetWorthBreakdownModern
            cash={totalBalance}
            stocksValue={totalStocksValue}
            cryptoValue={totalCryptoValue}
            companyEquity={companyEquity}
            isLoading={player === undefined}
          />

          {/* Collections Section (Marketplace Items) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Collections</CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <div className="text-lg font-semibold text-foreground">
                    <AnimatedNumber
                      value={
                        playerInventory?.reduce(
                          (sum, item) => sum + item.totalPrice,
                          0
                        ) || 0
                      }
                      compact={false}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!playerInventory || playerInventory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No marketplace items owned yet
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {playerInventory.map((item) => (
                    <div
                      key={item._id}
                      className="overflow-hidden rounded-lg border"
                    >
                      {/* Image Section */}
                      <div className="relative h-32 w-full bg-muted">
                        {item.productImage && item.productImage.trim() ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {/* Info Section */}
                      <div className="p-3">
                        <p className="truncate font-medium text-sm">
                          {item.productName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.companyName}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Qty</p>
                            <p className="font-semibold text-sm">
                              {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Total
                            </p>
                            <p className="font-semibold text-sm">
                              {formatCurrency(item.totalPrice)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
