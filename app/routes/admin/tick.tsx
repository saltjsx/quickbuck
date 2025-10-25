"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { Id } from "convex/_generated/dataModel";

export default function AdminTickPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [fixResult, setFixResult] = useState<any>(null);
  const [fixError, setFixError] = useState("");
  const [stockIdToFix, setStockIdToFix] = useState("");

  const manualTick = useMutation(api.tick.manualTick);
  const fixBrokenStock = useMutation(api.stocks.fixBrokenStock);
  const tickHistory = useQuery(api.tick.getTickHistory, {});

  const handleTick = async () => {
    try {
      setIsRunning(true);
      setError("");
      const res = await manualTick();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tick failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleFixStock = async () => {
    if (!stockIdToFix.trim()) {
      setFixError("Please enter a stock ID");
      return;
    }

    try {
      setFixError("");
      setFixResult(null);
      const res = await fixBrokenStock({
        stockId: stockIdToFix as Id<"stocks">,
      });
      setFixResult(res);
      setStockIdToFix("");
    } catch (err) {
      setFixError(err instanceof Error ? err.message : "Failed to fix stock");
    }
  };

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-3xl font-bold mb-6">Admin - Manual Tick Trigger</h1>

      <div className="grid gap-6">
        {/* Tick Trigger Card */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger Tick</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleTick}
              disabled={isRunning}
              size="lg"
              className="w-full"
            >
              {isRunning ? "Running..." : "Execute Tick"}
            </Button>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {result && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <p className="font-semibold">
                  Tick #{result.tickNumber} Completed
                </p>
                <p className="text-sm mt-2">
                  Bot Purchases: {result.botPurchases}
                </p>
                <p className="text-sm">Stock Updates: {result.stockUpdates}</p>
                <p className="text-sm">
                  Crypto Updates: {result.cryptoUpdates}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fix Broken Stock Card */}
        <Card>
          <CardHeader>
            <CardTitle>Fix Broken Stock (NaN Recovery)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stock-id">Stock ID</Label>
              <Input
                id="stock-id"
                placeholder="Paste the stock ID from your database"
                value={stockIdToFix}
                onChange={(e) => setStockIdToFix(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find the stock ID in your Convex dashboard: navigate to stocks
                table, find the stock by ticker (e.g., JEFF), and copy its ID.
              </p>
            </div>

            <Button onClick={handleFixStock} size="lg" className="w-full">
              Recover Stock
            </Button>

            {fixError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                {fixError}
              </div>
            )}

            {fixResult && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm space-y-1">
                <p className="font-semibold">✓ {fixResult.message}</p>
                <p>
                  Old Price:{" "}
                  {fixResult.oldPrice === null ||
                  !Number.isFinite(fixResult.oldPrice)
                    ? "NaN (Broken)"
                    : `$${(fixResult.oldPrice / 100).toFixed(2)}`}
                </p>
                <p>New Price: ${(fixResult.newPrice / 100).toFixed(2)}</p>
                <p>Recovery Method: {fixResult.recoveryMethod}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Ticks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Ticks</CardTitle>
          </CardHeader>
          <CardContent>
            {!tickHistory || tickHistory.length === 0 ? (
              <p className="text-muted-foreground">No ticks recorded yet</p>
            ) : (
              <div className="space-y-2">
                {tickHistory.slice(0, 10).map((tick: any) => (
                  <div
                    key={tick._id}
                    className="flex justify-between items-center p-2 bg-muted rounded"
                  >
                    <div>
                      <p className="font-semibold">Tick #{tick.tickNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tick.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Purchases: {tick.botPurchases?.length || 0}</p>
                      <p>
                        Updates:{" "}
                        {(tick.stockPriceUpdates?.length || 0) +
                          (tick.cryptoPriceUpdates?.length || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
