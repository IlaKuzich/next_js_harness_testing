"use client";

import { Heart } from "lucide-react";
import Link from "next/link";

import { useWishlist } from "~/lib/hooks/use-wishlist";
import { Button } from "~/ui/primitives/button";

// small header affordance: a heart that links to the wishlist page and shows
// how many products are currently saved
export function WishlistIndicator() {
  const { count } = useWishlist();

  return (
    <Button
      aria-label={`Wishlist (${count} item${count === 1 ? "" : "s"})`}
      asChild
      className="relative rounded-full"
      size="icon"
      variant="ghost"
    >
      <Link href="/wishlist">
        <Heart className="h-5 w-5" />
        {count > 0 && (
          <span
            className={`
              absolute -top-1 -right-1 flex h-4 min-w-4 items-center
              justify-center rounded-full bg-destructive px-1 text-[10px]
              font-medium text-destructive-foreground
            `}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
