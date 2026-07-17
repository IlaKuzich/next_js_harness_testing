"use client";

import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import type { OrderStatus } from "~/db/schema/orders/types";

import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { Button } from "~/ui/primitives/button";
import { Separator } from "~/ui/primitives/separator";

/* -------------------------------------------------------------------------- */
/*                               Type declarations                            */
/* -------------------------------------------------------------------------- */

interface OrderItemSummary {
  id: string;
  productImage: string;
  productName: string;
  quantity: number;
}

interface OrderSummary {
  createdAt: string;
  id: string;
  items: OrderItemSummary[];
  status: OrderStatus;
  total: number;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function OrdersPageClient() {
  const [orders, setOrders] = React.useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/orders");
        const data = (await response.json()) as {
          error?: string;
          orders: OrderSummary[];
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load orders");
        }

        if (!cancelled) setOrders(data.orders);
      } catch (error) {
        console.error("Error loading orders:", error);
        toast.error("Couldn't load your orders");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="mb-4 text-muted-foreground">
          You haven&apos;t placed any orders yet.
        </p>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Link
          className={`
            block rounded-lg border p-4 transition-colors
            hover:bg-accent/50
          `}
          href={`/orders/${order.id}`}
          key={order.id}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
              <p className="text-sm text-muted-foreground">
                Placed on {DATE_FORMATTER.format(new Date(order.createdAt))}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <Separator className="my-3" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {order.items.length} item{order.items.length === 1 ? "" : "s"}
            </span>
            <span className="font-semibold">
              {CURRENCY_FORMATTER.format(order.total)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
