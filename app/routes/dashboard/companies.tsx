"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

export default function ManageCompaniesPage() {
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

  // Get player's companies
  const companies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Mutations
  const createCompany = useMutation(api.companies.createCompany);
  const makeCompanyPublic = useMutation(api.companies.makeCompanyPublic);

  // State for create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyTicker, setCompanyTicker] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // State for make public modal
  const [publicModalOpen, setPublicModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] =
    useState<Id<"companies"> | null>(null);
  const [stockTicker, setStockTicker] = useState("");
  const [sharePrice, setSharePrice] = useState("");
  const [totalShares, setTotalShares] = useState("1000000");

  // State for edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCompanyId, setEditCompanyId] = useState<Id<"companies"> | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editTicker, setEditTicker] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Handle create company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!player) {
      setError("Player not found");
      return;
    }

    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCompany({
        ownerId: player._id,
        name: companyName.trim(),
        ticker: companyTicker.trim() || undefined,
        description: companyDescription.trim() || undefined,
      });

      // Reset form and close modal
      setCompanyName("");
      setCompanyTicker("");
      setCompanyDescription("");
      setCreateModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle make company public
  const handleMakePublic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCompanyId) {
      setError("No company selected");
      return;
    }

    if (!stockTicker.trim()) {
      setError("Stock ticker is required");
      return;
    }

    const price = parseFloat(sharePrice);
    const shares = parseInt(totalShares);

    if (isNaN(price) || price <= 0) {
      setError("Invalid share price");
      return;
    }

    if (isNaN(shares) || shares <= 0) {
      setError("Invalid number of shares");
      return;
    }

    setIsSubmitting(true);
    try {
      await makeCompanyPublic({
        companyId: selectedCompanyId,
        ticker: stockTicker.trim().toUpperCase(),
        initialSharePrice: Math.round(price * 100), // Convert to cents
        totalShares: shares,
      });

      // Reset form and close modal
      setStockTicker("");
      setSharePrice("");
      setTotalShares("1000000");
      setPublicModalOpen(false);
      setSelectedCompanyId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to make company public"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open make public modal
  const openMakePublicModal = (companyId: Id<"companies">, name: string) => {
    setSelectedCompanyId(companyId);
    setStockTicker(name.substring(0, 4).toUpperCase());
    setPublicModalOpen(true);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Manage Companies
              </h1>
              <p className="text-muted-foreground">
                Create and manage your business empire
              </p>
            </div>

            {/* Create Company Button */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Company
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                  <DialogDescription>
                    Start a new business venture
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCompany} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input
                      id="company-name"
                      placeholder="Enter company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-ticker">
                      Ticker Symbol (optional)
                    </Label>
                    <Input
                      id="company-ticker"
                      placeholder="e.g., TECH"
                      value={companyTicker}
                      onChange={(e) =>
                        setCompanyTicker(e.target.value.toUpperCase())
                      }
                      maxLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-description">
                      Description (optional)
                    </Label>
                    <Textarea
                      id="company-description"
                      placeholder="What does your company do?"
                      value={companyDescription}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCompanyDescription(e.target.value)
                      }
                      rows={3}
                    />
                  </div>

                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Company"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Companies Grid */}
          {!companies ? (
            <p className="text-sm text-muted-foreground">
              Loading companies...
            </p>
          ) : companies.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No companies yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create your first company to start building your empire
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Company
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <Card key={company._id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {company.name}
                        </CardTitle>
                        {company.ticker && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {company.ticker}
                            </Badge>
                            {company.isPublic && (
                              <Badge variant="default" className="text-xs">
                                Public
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Balance */}
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(company.balance)}
                      </p>
                    </div>

                    {/* Market Cap (if public) */}
                    {company.isPublic && company.marketCap && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Market Cap
                        </p>
                        <p className="flex items-center gap-1 text-lg font-semibold text-purple-600">
                          <TrendingUp className="h-4 w-4" />
                          {formatCurrency(company.marketCap)}
                        </p>
                      </div>
                    )}

                    {/* Description */}
                    {company.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {company.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" disabled>
                        <Edit className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        <Trash2 className="mr-2 h-3 w-3" />
                        Delete
                      </Button>
                    </div>

                    {/* Make Public Button */}
                    {!company.isPublic && company.balance >= 5000000 && (
                      <Button
                        className="w-full"
                        onClick={() =>
                          openMakePublicModal(company._id, company.name)
                        }
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Make Public (IPO)
                      </Button>
                    )}

                    {!company.isPublic && company.balance < 5000000 && (
                      <p className="text-xs text-center text-muted-foreground">
                        Need {formatCurrency(5000000 - company.balance)} more to
                        go public
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Make Public Modal */}
          <Dialog open={publicModalOpen} onOpenChange={setPublicModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Make Company Public (IPO)</DialogTitle>
                <DialogDescription>
                  Set the initial stock price and number of shares
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMakePublic} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stock-ticker">Stock Ticker *</Label>
                  <Input
                    id="stock-ticker"
                    placeholder="e.g., TECH"
                    value={stockTicker}
                    onChange={(e) =>
                      setStockTicker(e.target.value.toUpperCase())
                    }
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="share-price">Initial Share Price ($) *</Label>
                  <Input
                    id="share-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="10.00"
                    value={sharePrice}
                    onChange={(e) => setSharePrice(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total-shares">Total Shares *</Label>
                  <Input
                    id="total-shares"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="1000000"
                    value={totalShares}
                    onChange={(e) => setTotalShares(e.target.value)}
                    required
                  />
                </div>

                {sharePrice && totalShares && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm font-medium">Initial Market Cap:</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(
                        Math.round(
                          parseFloat(sharePrice) * parseInt(totalShares) * 100
                        )
                      )}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPublicModalOpen(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Go Public"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
