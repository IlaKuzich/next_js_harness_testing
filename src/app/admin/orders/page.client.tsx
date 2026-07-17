"use client";

import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import type { OrderStatus } from "~/db/schema/orders/types";

import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/primitives/table";

/* -------------------------------------------------------------------------- */
/*                               Type declarations                            */
/* -------------------------------------------------------------------------- */

interface AdminOrderRow {
  createdAt: string;
  id: string;
  status: OrderStatus;
  total: number;
  user: null | { email: string; id: string; name: string };
}

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

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

export default function AdminOrdersPageClient() {
  const [orders, setOrders] = React.useState<AdminOrderRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [updatingOrderId, setUpdatingOrderId] = React.useState<null | string>(
    null,
  );

  React.useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/orders");
        const data = (await response.json()) as {
          error?: string;
          orders: AdminOrderRow[];
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load orders");
        }

        if (!cancelled) setOrders(data.orders);
      } catch (error) {
        console.error("Error loading orders:", error);
        toast.error("Couldn't load orders");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = React.useCallback(
    async (orderId: string, nextStatus: OrderStatus) => {
      setUpdatingOrderId(orderId);
      try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
          body: JSON.stringify({ status: nextStatus }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
        const data = (await response.json()) as {
          error?: string;
          order?: { status: OrderStatus };
        };

        if (!response.ok || !data.order) {
          throw new Error(data.error ?? "Failed to update order");
        }

        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? { ...order, status: data.order!.status }
              : order,
          ),
        );
        toast.success(`Order updated to "${nextStatus}"`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update order";
        toast.error(message);
      } finally {
        setUpdatingOrderId(null);
      }
    },
    [],
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  }

  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground">No orders yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Update status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <Link
                className={`
                font-medium
                hover:underline
              `}
                href={`/orders/${order.id}`}
              >
                #{order.id.slice(0, 8)}
              </Link>
            </TableCell>
            <TableCell>
              <div>{order.user?.name ?? "Unknown"}</div>
              <div className="text-xs text-muted-foreground">
                {order.user?.email ?? "—"}
              </div>
            </TableCell>
            <TableCell>
              {DATE_FORMATTER.format(new Date(order.createdAt))}
            </TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-right">
              {CURRENCY_FORMATTER.format(order.total)}
            </TableCell>
            <TableCell className="text-right">
              <select
                className={`
                  rounded-md border bg-transparent px-2 py-1 text-sm
                  disabled:opacity-50
                `}
                disabled={updatingOrderId === order.id}
                onChange={(event) =>
                  void handleStatusChange(
                    order.id,
                    event.target.value as OrderStatus,
                  )
                }
                value={order.status}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
