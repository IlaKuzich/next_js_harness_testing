"use client";

import { Heart } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import type { WishlistProduct } from "~/lib/hooks/use-wishlist";

import { cn } from "~/lib/cn";
import { useWishlist } from "~/lib/hooks/use-wishlist";
import { Button } from "~/ui/primitives/button";

interface WishlistButtonProps {
  className?: string;
  product: WishlistProduct;
  // "icon" renders a round heart-only button (product cards); "full" renders
  // a labelled button (product detail page)
  variant?: "full" | "icon";
}

export function WishlistButton({
  className,
  product,
  variant = "icon",
}: WishlistButtonProps) {
  const { isSaved, toggle } = useWishlist();
  const [isPending, setIsPending] = React.useState(false);

  const saved = isSaved(product.id);

  const handleClick = async (e: React.MouseEvent) => {
    // product cards wrap the button in a <Link>, so stop the click from
    // navigating to the product page when someone hearts it
    e.preventDefault();
    e.stopPropagation();

    if (isPending) return;
    setIsPending(true);

    try {
      const nowSaved = await toggle(product);
      toast.success(
        nowSaved ? "Added to your wishlist" : "Removed from your wishlist",
      );
    } catch {
      toast.error("Couldn't update your wishlist. Please sign in and retry.");
    } finally {
      setIsPending(false);
    }
  };

  if (variant === "full") {
    return (
      <Button
        aria-pressed={saved}
        className={cn("gap-2", className)}
        disabled={isPending}
        onClick={handleClick}
        type="button"
        variant={saved ? "default" : "outline"}
      >
        <Heart
          className={cn("h-4 w-4", saved && "fill-current")}
        />
        {saved ? "Saved" : "Save for later"}
      </Button>
    );
  }

  return (
    <Button
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={saved}
      className={cn(
        `
          rounded-full bg-background/80 backdrop-blur-sm transition-opacity
          duration-300
        `,
        className,
      )}
      disabled={isPending}
      onClick={handleClick}
      size="icon"
      type="button"
      variant="outline"
    >
      <Heart
        className={cn(
          "h-4 w-4",
          saved
            ? "fill-destructive text-destructive"
            : "text-muted-foreground",
        )}
      />
      <span className="sr-only">
        {saved ? "Remove from wishlist" : "Add to wishlist"}
      </span>
    </Button>
  );
}
