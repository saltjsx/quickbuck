"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import { ArrowRight, Send, History } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

export default function TransfersPage() {
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

  // Get player companies
  const companies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get transaction history
  const transactions = useQuery(
    api.transactions.getPlayerTransactionHistory,
    player?._id ? { playerId: player._id, limit: 10 } : "skip"
  );

  // Get all players for recipient selection
  const allPlayers = useQuery(api.leaderboard.getAllPlayersSorted, {
    sortBy: "netWorth",
    limit: 100,
  });

  // Get all companies for recipient selection
  const allCompanies = useQuery(api.leaderboard.getAllCompaniesSorted, {
    sortBy: "marketCap",
    limit: 100,
  });

  // Transfer mutation
  const transferCash = useMutation(api.transactions.transferCash);

  // Form state
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [assetType, setAssetType] = useState("cash");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!fromAccount) {
      setError("Please select a from account");
      return;
    }
    if (!toAccount) {
      setError("Please select a recipient account");
      return;
    }
    if (fromAccount === toAccount) {
      setError("Cannot transfer to the same account");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (parseFloat(amount) < 1) {
      setError("Minimum transfer amount is $0.01");
      return;
    }
    if (!description.trim()) {
      setError("Please enter a description");
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse from and to accounts
      const [fromType, fromId] = fromAccount.split(":");
      const [toType, toId] = toAccount.split(":");

      const amountInCents = Math.round(parseFloat(amount) * 100);

      await transferCash({
        fromAccountId: fromId as Id<"players"> | Id<"companies">,
        fromAccountType: fromType as "player" | "company",
        toAccountId: toId as Id<"players"> | Id<"companies">,
        toAccountType: toType as "player" | "company",
        amount: amountInCents,
        description: description.trim(),
      });

      setSuccess("Transfer completed successfully!");
      // Reset form
      setAmount("");
      setDescription("");
      setToAccount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transfers</h1>
            <p className="text-muted-foreground">
              Send money and assets between accounts
            </p>
          </div>

          {/* Transfer Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Money/Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* From Account */}
                <div className="space-y-2">
                  <Label htmlFor="from-account">From Account</Label>
                  <Select value={fromAccount} onValueChange={setFromAccount}>
                    <SelectTrigger id="from-account">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {player && (
                        <SelectItem value={`player:${player._id}`}>
                          Personal Account - {formatCurrency(player.balance)}
                        </SelectItem>
                      )}
                      {companies?.map((company) => (
                        <SelectItem
                          key={company._id}
                          value={`company:${company._id}`}
                        >
                          {company.name} - {formatCurrency(company.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-center py-2">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* To Account */}
                <div className="space-y-2">
                  <Label htmlFor="to-account">To Account</Label>
                  <Select value={toAccount} onValueChange={setToAccount}>
                    <SelectTrigger id="to-account">
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-sm font-semibold">
                        Players
                      </div>
                      {allPlayers?.players
                        .filter((p) => p._id !== player?._id)
                        .map((p) => (
                          <SelectItem key={p._id} value={`player:${p._id}`}>
                            {p.userName} (Player)
                          </SelectItem>
                        ))}
                      <div className="px-2 py-1.5 text-sm font-semibold">
                        Companies
                      </div>
                      {allCompanies?.companies
                        .filter((c) => c.ownerId !== player?._id)
                        .map((c) => (
                          <SelectItem key={c._id} value={`company:${c._id}`}>
                            {c.name} ({c.ticker || "Private"})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Asset Type */}
                <div className="space-y-2">
                  <Label>Asset Type</Label>
                  <RadioGroup value={assetType} onValueChange={setAssetType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="font-normal">
                        Cash
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="crypto" id="crypto" disabled />
                      <Label
                        htmlFor="crypto"
                        className="font-normal text-muted-foreground"
                      >
                        Crypto (Coming soon)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="stock" id="stock" disabled />
                      <Label
                        htmlFor="stock"
                        className="font-normal text-muted-foreground"
                      >
                        Stock Holdings (Coming soon)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="What is this transfer for?"
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setDescription(e.target.value)
                    }
                    required
                  />
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                    {success}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Processing..." : "Send Transfer"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Transfer History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!transactions ? (
                <p className="text-sm text-muted-foreground">
                  Loading transfers...
                </p>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No transfers yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const isSent = tx.fromAccountId === player?._id;
                      return (
                        <TableRow key={tx._id}>
                          <TableCell className="text-sm">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs font-medium ${
                                isSent ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {isSent ? "Sent" : "Received"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {tx.description}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              isSent ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {isSent ? "-" : "+"}
                            {formatCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
