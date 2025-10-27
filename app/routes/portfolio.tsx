"use client";

import { useState } from "react";
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
import {
  TrendingUp,
  Building2,
  Coins,
  ShoppingBag,
  ArrowUpDown,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/portfolio";

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

  // Get player data for net worth calculation
  const playerData = useQuery(
    api.players.getPlayer,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get stock holdings
  const stockHoldings = useQuery(
    api.stocks.getPlayerStockHoldings,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get crypto holdings
  const cryptoHoldings = useQuery(
    api.crypto.getPlayerCryptoHoldings,
    player?._id ? { playerId: player._id } : "skip"
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

  // Get all cryptos at once to avoid hooks issues
  const allCryptos = useQuery(api.crypto.getAllCryptocurrencies, {});

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

  // Build crypto details by matching holdings with crypto data
  const cryptoWithDetails =
    cryptoHoldings && allCryptos
      ? cryptoHoldings
          .map((holding) => {
            const crypto = allCryptos.find((c) => c._id === holding.cryptoId);
            return { holding, crypto };
          })
          .filter((item) => item.crypto)
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
        (item.crypto ? Math.floor(item.holding.amount * item.crypto.price) : 0),
      0
    ) || 0;

  const totalNetWorth = playerData?.netWorth || 0;

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
            (a.crypto ? Math.floor(a.holding.amount * a.crypto.price) : 0) -
            (b.crypto ? Math.floor(b.holding.amount * b.crypto.price) : 0);
          break;
        case "amount":
          comparison = a.holding.amount - b.holding.amount;
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

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header with Net Worth */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Portfolio
            </h1>
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-6 py-4">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="text-sm text-muted-foreground">Total Net Worth</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(totalNetWorth)}
                </p>
              </div>
            </div>
          </div>

          {/* Stocks Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Stock Holdings</CardTitle>
                </div>
                <Badge variant="outline" className="text-lg font-semibold">
                  {formatCurrency(totalStocksValue)}
                </Badge>
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
                      <TableHead>Company</TableHead>
                      <TableHead>Ticker</TableHead>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStocks.map((item) => {
                      const value = item.stock
                        ? item.holding.shares * item.stock.price
                        : 0;
                      return (
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
                              <div className="flex flex-col">
                                <span className="text-sm">Stock</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {item.stock?.ticker}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.holding.shares.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(value)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-green-600">
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
                <Badge variant="outline" className="text-lg font-semibold">
                  {formatCurrency(totalCryptoValue)}
                </Badge>
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
                      <TableHead>Cryptocurrency</TableHead>
                      <TableHead>Ticker</TableHead>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCrypto.map((item) => {
                      const value = item.crypto
                        ? Math.floor(item.holding.amount * item.crypto.price)
                        : 0;
                      return (
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
                              {item.crypto?.image && (
                                <img
                                  src={item.crypto.image}
                                  alt={item.crypto.name}
                                  className="h-8 w-8 rounded"
                                />
                              )}
                              {item.crypto?.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {item.crypto?.ticker}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.holding.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(value)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(totalCryptoValue)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Collections Section (Marketplace Items) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Collections</CardTitle>
                </div>
                <Badge variant="outline" className="text-lg font-semibold">
                  {formatCurrency(
                    playerInventory?.reduce(
                      (sum, item) => sum + item.totalPrice,
                      0
                    ) || 0
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!playerInventory || playerInventory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No marketplace items owned yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerInventory.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.companyName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          playerInventory.reduce(
                            (sum, item) => sum + item.totalPrice,
                            0
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
