"use client";

import * as React from "react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface WishlistProduct {
  category: string;
  id: string;
  image: string;
  name: string;
  price: number;
}

export interface WishlistContextType {
  // add a product; no-op if it is already saved
  add: (product: WishlistProduct) => Promise<void>;
  // whether the initial server hydration has finished
  isReady: boolean;
  // whether a product is currently saved
  isSaved: (productId: string) => boolean;
  // number of saved products
  count: number;
  // remove a product; no-op if it is not saved
  remove: (productId: string) => Promise<void>;
  // add when missing, remove when present; resolves to the new saved state
  toggle: (product: WishlistProduct) => Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/*                                 Context                                    */
/* -------------------------------------------------------------------------- */

const WishlistContext = React.createContext<undefined | WishlistContextType>(
  undefined,
);

/* -------------------------------------------------------------------------- */
/*                                 Provider                                   */
/* -------------------------------------------------------------------------- */

export function WishlistProvider({ children }: React.PropsWithChildren) {
  // the saved product ids are the single source of truth on the client; the
  // server owns the full rows, but the grid only needs "is this hearted?"
  const [savedIds, setSavedIds] = React.useState<Set<string>>(
    () => new Set<string>(),
  );
  const [isReady, setIsReady] = React.useState(false);

  /* --------------------- Hydrate from the server once ------------------- */
  React.useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const response = await fetch("/api/wishlist?ids=1");

        // an unauthenticated visitor gets a 401 here; that is expected, the
        // wishlist simply stays empty until they sign in
        if (!response.ok) {
          if (!cancelled) setIsReady(true);
          return;
        }

        const data = (await response.json()) as { productIds?: string[] };
        if (!cancelled) {
          setSavedIds(new Set(data.productIds ?? []));
          setIsReady(true);
        }
      } catch (error) {
        console.error("Failed to hydrate wishlist:", error);
        if (!cancelled) setIsReady(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------- Helpers -------------------------------- */
  const isSaved = React.useCallback(
    (productId: string) => savedIds.has(productId),
    [savedIds],
  );

  const add = React.useCallback(async (product: WishlistProduct) => {
    // optimistically flip the heart, then reconcile with the server
    setSavedIds((prev) => {
      if (prev.has(product.id)) return prev;
      const next = new Set(prev);
      next.add(product.id);
      return next;
    });

    try {
      const response = await fetch("/api/wishlist", {
        body: JSON.stringify({
          productCategory: product.category,
          productId: product.id,
          productImage: product.image,
          productName: product.name,
          productPrice: product.price,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }
    } catch (error) {
      console.error("Failed to add to wishlist:", error);
      // roll back the optimistic update
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      throw error;
    }
  }, []);

  const remove = React.useCallback(async (productId: string) => {
    // remember the previous state so we can roll back on failure
    let wasSaved = false;
    setSavedIds((prev) => {
      wasSaved = prev.has(productId);
      if (!wasSaved) return prev;
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });

    try {
      const response = await fetch(
        `/api/wishlist?productId=${encodeURIComponent(productId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Request failed");
      }
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
      if (wasSaved) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.add(productId);
          return next;
        });
      }
      throw error;
    }
  }, []);

  const toggle = React.useCallback(
    async (product: WishlistProduct): Promise<boolean> => {
      if (savedIds.has(product.id)) {
        await remove(product.id);
        return false;
      }
      await add(product);
      return true;
    },
    [savedIds, add, remove],
  );

  /* --------------------------- Derived data ----------------------------- */
  const count = savedIds.size;

  const value = React.useMemo<WishlistContextType>(
    () => ({ add, count, isReady, isSaved, remove, toggle }),
    [add, count, isReady, isSaved, remove, toggle],
  );

  return <WishlistContext value={value}>{children}</WishlistContext>;
}

/* -------------------------------------------------------------------------- */
/*                                   Hook                                     */
/* -------------------------------------------------------------------------- */

export function useWishlist(): WishlistContextType {
  const ctx = React.use(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return ctx;
}
