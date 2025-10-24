"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import { ShoppingCart, Package, Search, Trash2 } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

export default function MarketplacePage() {
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

  // Get all products and companies
  const allProducts = useQuery(api.products.getAllProducts);
  const allCompanies = useQuery(api.companies.getAllPublicCompanies);

  // Get player's cart
  const cartData = useQuery(
    api.cart.getPlayerCart,
    player?._id ? { userId: player._id } : "skip"
  );

  // Get player's companies for checkout
  const playerCompanies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Mutations
  const addToCart = useMutation(api.cart.addToCart);
  const removeFromCart = useMutation(api.cart.removeFromCart);
  const updateQuantity = useMutation(api.cart.updateCartItemQuantity);
  const checkout = useMutation(api.cart.checkout);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "newest">(
    "newest"
  );

  // Checkout state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutAccount, setCheckoutAccount] = useState<{
    type: "player" | "company";
    id: Id<"players"> | Id<"companies">;
  } | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Add to cart state
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];

    let filtered = allProducts.filter((product) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDesc = product.description?.toLowerCase().includes(query);
        const matchesTags = product.tags?.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }

      // Company filter
      if (selectedCompany !== "all" && product.companyId !== selectedCompany) {
        return false;
      }

      // Price range filter
      const min = minPrice ? parseFloat(minPrice) * 100 : 0;
      const max = maxPrice ? parseFloat(maxPrice) * 100 : Infinity;
      if (product.price < min || product.price > max) return false;

      return true;
    });

    // Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return filtered;
  }, [allProducts, searchQuery, selectedCompany, minPrice, maxPrice, sortBy]);

  // Get company name
  const getCompanyName = (companyId: Id<"companies">) => {
    const company = allCompanies?.find((c) => c._id === companyId);
    return company?.name || "Unknown";
  };

  // Handle add to cart
  const handleAddToCart = async (productId: Id<"products">) => {
    if (!player) return;

    const quantity = quantities[productId] || 1;
    setAddingToCart(productId);

    try {
      await addToCart({
        userId: player._id,
        productId,
        quantity,
      });
      setQuantities({ ...quantities, [productId]: 1 });
    } catch (err) {
      console.error("Failed to add to cart:", err);
    } finally {
      setAddingToCart(null);
    }
  };

  // Handle remove from cart
  const handleRemoveFromCart = async (productId: Id<"products">) => {
    if (!player) return;

    try {
      await removeFromCart({
        userId: player._id,
        productId,
      });
    } catch (err) {
      console.error("Failed to remove from cart:", err);
    }
  };

  // Handle update cart quantity
  const handleUpdateQuantity = async (
    productId: Id<"products">,
    quantity: number
  ) => {
    if (!player || quantity <= 0) return;

    try {
      await updateQuantity({
        userId: player._id,
        productId,
        quantity,
      });
    } catch (err) {
      console.error("Failed to update quantity:", err);
    }
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (!checkoutAccount) {
      setCheckoutError("Please select an account");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError("");

    try {
      await checkout({
        userId: player!._id,
        accountType: checkoutAccount.type,
        accountId: checkoutAccount.id,
      });
      setCheckoutOpen(false);
      setCheckoutAccount(null);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Get cart items with product details
  const cartItems = useMemo(() => {
    if (!cartData?.items || !allProducts) return [];
    return cartData.items.map((item) => {
      const product = allProducts.find((p) => p._id === item.productId);
      return { ...item, product };
    });
  }, [cartData, allProducts]);

  const cartTotal = cartData?.cart?.totalPrice || 0;
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
              <p className="text-muted-foreground">
                Browse and purchase products from companies
              </p>
            </div>

            {/* Cart Button */}
            <Button
              onClick={() => setCheckoutOpen(true)}
              disabled={cartItemCount === 0}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart ({cartItemCount})
            </Button>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Select
                    value={selectedCompany}
                    onValueChange={setSelectedCompany}
                  >
                    <SelectTrigger id="company">
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {allCompanies?.map((company) => (
                        <SelectItem key={company._id} value={company._id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-price">Min Price ($)</Label>
                  <Input
                    id="min-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-price">Max Price ($)</Label>
                  <Input
                    id="max-price"
                    type="number"
                    step="0.01"
                    placeholder="1000.00"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="sort">Sort by:</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger id="sort" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-asc">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price-desc">
                      Price: High to Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          {!allProducts ? (
            <p className="text-sm text-muted-foreground">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  No products found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card key={product._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {product.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {getCompanyName(product.companyId)}
                        </p>
                      </div>
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>

                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(product.price)}
                      </p>
                      {product.stock !== undefined &&
                        product.stock !== null && (
                          <p className="text-sm text-muted-foreground">
                            Stock: {product.stock}
                          </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={quantities[product._id] || 1}
                        onChange={(e) =>
                          setQuantities({
                            ...quantities,
                            [product._id]: Math.max(
                              1,
                              parseInt(e.target.value) || 1
                            ),
                          })
                        }
                        className="w-20"
                      />
                      <Button
                        className="flex-1"
                        onClick={() => handleAddToCart(product._id)}
                        disabled={
                          addingToCart === product._id ||
                          (product.stock !== undefined &&
                            product.stock !== null &&
                            product.stock === 0)
                        }
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {addingToCart === product._id
                          ? "Adding..."
                          : "Add to Cart"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Checkout Modal */}
          <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Shopping Cart</DialogTitle>
                <DialogDescription>
                  Review your cart and complete purchase
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {cartItems.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">
                    Your cart is empty
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartItems.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell className="font-medium">
                              {item.product?.name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.pricePerUnit)}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateQuantity(
                                    item.productId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              {formatCurrency(
                                item.pricePerUnit * item.quantity
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveFromCart(item.productId)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex justify-between border-t pt-4">
                      <p className="text-lg font-semibold">Total:</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(cartTotal)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Account</Label>
                      <Select
                        value={
                          checkoutAccount
                            ? `${checkoutAccount.type}:${checkoutAccount.id}`
                            : ""
                        }
                        onValueChange={(value) => {
                          const [type, id] = value.split(":");
                          setCheckoutAccount({
                            type: type as "player" | "company",
                            id: id as any,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {player && (
                            <SelectItem value={`player:${player._id}`}>
                              Personal ({formatCurrency(player.balance)})
                            </SelectItem>
                          )}
                          {playerCompanies?.map((company) => (
                            <SelectItem
                              key={company._id}
                              value={`company:${company._id}`}
                            >
                              {company.name} ({formatCurrency(company.balance)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {checkoutError && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {checkoutError}
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCheckoutOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={
                    isCheckingOut || cartItems.length === 0 || !checkoutAccount
                  }
                >
                  {isCheckingOut ? "Processing..." : "Complete Purchase"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
