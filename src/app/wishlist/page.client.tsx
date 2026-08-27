"use client";

import { Heart, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { useCart } from "~/lib/hooks/use-cart";
import { useWishlist } from "~/lib/hooks/use-wishlist";
import { Button } from "~/ui/primitives/button";
import { Separator } from "~/ui/primitives/separator";

/* -------------------------------------------------------------------------- */
/*                               Type declarations                            */
/* -------------------------------------------------------------------------- */

interface WishlistItemView {
  id: string;
  productCategory: string;
  productId: string;
  productImage: string;
  productName: string;
  productPrice: number;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function WishlistPageClient() {
  const { addItem } = useCart();
  const { remove } = useWishlist();

  const [items, setItems] = React.useState<WishlistItemView[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  /* ------------------------- Load the full wishlist --------------------- */
  React.useEffect(() => {
    let cancelled = false;

    async function loadWishlist() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/wishlist");
        const data = (await response.json()) as {
          error?: string;
          items: WishlistItemView[];
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load wishlist");
        }

        if (!cancelled) setItems(data.items);
      } catch (error) {
        console.error("Error loading wishlist:", error);
        toast.error("Couldn't load your wishlist");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadWishlist();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------ Handlers ------------------------------ */
  const handleRemove = React.useCallback(
    async (productId: string) => {
      // optimistically drop it from the list, and let the shared hook keep
      // the header/grid hearts in sync
      const previous = items;
      setItems((prev) => prev.filter((i) => i.productId !== productId));

      try {
        await remove(productId);
        toast.success("Removed from your wishlist");
      } catch {
        setItems(previous);
        toast.error("Couldn't remove that item");
      }
    },
    [items, remove],
  );

  const handleMoveToCart = React.useCallback(
    async (item: WishlistItemView) => {
      addItem(
        {
          category: item.productCategory,
          id: item.productId,
          image: item.productImage,
          name: item.productName,
          price: item.productPrice,
        },
        1,
      );

      const previous = items;
      setItems((prev) => prev.filter((i) => i.productId !== item.productId));

      try {
        await remove(item.productId);
        toast.success("Moved to your cart");
      } catch {
        setItems(previous);
        toast.error("Added to cart, but couldn't remove from wishlist");
      }
    },
    [addItem, items, remove],
  );

  const handleClearAll = React.useCallback(async () => {
    const previous = items;
    setItems([]);

    try {
      const response = await fetch("/api/wishlist?all=1", { method: "DELETE" });
      if (!response.ok) throw new Error("Request failed");
      toast.success("Wishlist cleared");
    } catch {
      setItems(previous);
      toast.error("Couldn't clear your wishlist");
    }
  }, [items]);

  /* ------------------------------- Render ------------------------------- */
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading wishlist…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <Heart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="mb-4 text-muted-foreground">
          Your wishlist is empty. Save products you love to find them later.
        </p>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"} saved
        </p>
        <Button
          className="gap-2"
          onClick={handleClearAll}
          size="sm"
          variant="ghost"
        >
          <Trash2 className="h-4 w-4" />
          Clear all
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            className="flex items-center gap-4 rounded-lg border p-4"
            key={item.id}
          >
            <Link
              className={`
                relative h-20 w-20 shrink-0 overflow-hidden rounded-md border
              `}
              href={`/products/${item.productId}`}
            >
              {item.productImage && (
                <Image
                  alt={item.productName}
                  className="object-cover"
                  fill
                  sizes="80px"
                  src={item.productImage}
                />
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                className={`
                  line-clamp-1 font-medium transition-colors
                  hover:text-primary
                `}
                href={`/products/${item.productId}`}
              >
                {item.productName}
              </Link>
              <p className="text-sm text-muted-foreground">
                {item.productCategory}
              </p>
              <p className="mt-1 font-semibold">
                {CURRENCY_FORMATTER.format(item.productPrice)}
              </p>
            </div>

            <Separator className="h-16" orientation="vertical" />

            <div className="flex shrink-0 flex-col gap-2">
              <Button
                onClick={() => void handleMoveToCart(item)}
                size="sm"
              >
                Move to cart
              </Button>
              <Button
                className="gap-2"
                onClick={() => void handleRemove(item.productId)}
                size="sm"
                variant="outline"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
