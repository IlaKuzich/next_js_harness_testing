"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import type { OrderStatus } from "~/db/schema/orders/types";
import type { ReturnStatus } from "~/db/schema/returns/types";

import { OrderStatusBadge } from "~/ui/components/order-status-badge";
import { ReturnStatusBadge } from "~/ui/components/return-status-badge";
import { Button } from "~/ui/primitives/button";
import { Checkbox } from "~/ui/primitives/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/primitives/dialog";
import { Input } from "~/ui/primitives/input";
import { Label } from "~/ui/primitives/label";
import { Separator } from "~/ui/primitives/separator";

/* -------------------------------------------------------------------------- */
/*                               Type declarations                            */
/* -------------------------------------------------------------------------- */

interface OrderDetail {
  createdAt: string;
  id: string;
  items: OrderItemDetail[];
  shippingCity: string;
  shippingCost: number;
  shippingCountry: string;
  shippingLine1: string;
  shippingLine2: null | string;
  shippingName: string;
  shippingPostalCode: string;
  shippingState: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
}

interface OrderItemDetail {
  id: string;
  lineTotal: number;
  productId: string;
  productImage: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface ReturnSummary {
  id: string;
  reason: string;
  status: ReturnStatus;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function OrderDetailPageClient({
  orderId,
}: { orderId: string }) {
  const router = useRouter();

  const [order, setOrder] = React.useState<null | OrderDetail>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const [existingReturn, setExistingReturn] =
    React.useState<null | ReturnSummary>(null);
  const [returnDialogOpen, setReturnDialogOpen] = React.useState(false);
  const [selectedItemIds, setSelectedItemIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [returnQuantities, setReturnQuantities] = React.useState<
    Record<string, number>
  >({});
  const [returnReason, setReturnReason] = React.useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = React.useState(false);

  const loadOrder = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = (await response.json()) as {
        error?: string;
        order?: OrderDetail;
      };

      if (!response.ok || !data.order) {
        throw new Error(data.error ?? "Order not found");
      }

      setOrder(data.order);
    } catch (error) {
      console.error("Error loading order:", error);
      toast.error("Couldn't load this order");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  const loadReturn = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/returns?orderId=${orderId}`);
      const data = (await response.json()) as {
        error?: string;
        returns?: ReturnSummary[];
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load return status");
      }

      const active = (data.returns ?? []).find(
        (returnRequest) =>
          returnRequest.status === "requested" ||
          returnRequest.status === "approved" ||
          returnRequest.status === "refunded",
      );
      setExistingReturn(active ?? data.returns?.[0] ?? null);
    } catch (error) {
      console.error("Error loading return status:", error);
    }
  }, [orderId]);

  React.useEffect(() => {
    void loadOrder();
    void loadReturn();
  }, [loadOrder, loadReturn]);

  const openReturnDialog = () => {
    setSelectedItemIds(new Set());
    setReturnQuantities(
      Object.fromEntries(
        order?.items.map((item) => [item.id, item.quantity]) ?? [],
      ),
    );
    setReturnReason("");
    setReturnDialogOpen(true);
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSubmitReturn = async (event: React.FormEvent) => {
    event.preventDefault();

    const items = [...selectedItemIds].map((itemId) => ({
      orderItemId: itemId,
      quantity: returnQuantities[itemId] ?? 1,
    }));

    if (items.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const response = await fetch("/api/returns", {
        body: JSON.stringify({ items, orderId, reason: returnReason }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to request return");
      }

      toast.success("Return requested");
      setReturnDialogOpen(false);
      await loadReturn();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to request return";
      toast.error(message);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleCancel = React.useCallback(async () => {
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        body: JSON.stringify({ action: "cancel" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = (await response.json()) as {
        error?: string;
        order?: OrderDetail;
      };

      if (!response.ok || !data.order) {
        throw new Error(data.error ?? "Failed to cancel order");
      }

      setOrder(data.order);
      toast.success("Order cancelled");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel order";
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  }, [orderId]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading order…</p>;
  }

  if (!order) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Order Not Found</h1>
        <Button className="mt-6" onClick={() => router.push("/orders")}>
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {DATE_FORMATTER.format(new Date(order.createdAt))}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div
        className={`
          grid grid-cols-1 gap-8
          md:grid-cols-2
        `}
      >
        <section>
          <h2 className="mb-4 text-xl font-semibold">Items</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div className="flex items-center gap-4" key={item.id}>
                <div
                  className={`
                    relative h-16 w-16 shrink-0 overflow-hidden rounded bg-muted
                  `}
                >
                  <Image
                    alt={item.productName}
                    className="object-cover"
                    fill
                    src={item.productImage}
                  />
                </div>
                <div className="flex-1">
                  <Link
                    className={`
                    font-medium
                    hover:underline
                  `}
                    href={`/products/${item.productId}`}
                  >
                    {item.productName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} ×{" "}
                    {CURRENCY_FORMATTER.format(item.unitPrice)}
                  </p>
                </div>
                <div className="font-semibold">
                  {CURRENCY_FORMATTER.format(item.lineTotal)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Shipping address</h2>
          <address className="text-sm text-muted-foreground not-italic">
            {order.shippingName}
            <br />
            {order.shippingLine1}
            <br />
            {order.shippingLine2 && (
              <>
                {order.shippingLine2}
                <br />
              </>
            )}
            {order.shippingCity}, {order.shippingState}{" "}
            {order.shippingPostalCode}
            <br />
            {order.shippingCountry}
          </address>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{CURRENCY_FORMATTER.format(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {order.shippingCost === 0
                  ? "Free"
                  : CURRENCY_FORMATTER.format(order.shippingCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{CURRENCY_FORMATTER.format(order.tax)}</span>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{CURRENCY_FORMATTER.format(order.total)}</span>
          </div>

          {order.status === "pending" && (
            <Button
              className="mt-6"
              disabled={isCancelling}
              onClick={handleCancel}
              variant="outline"
            >
              {isCancelling ? "Cancelling…" : "Cancel order"}
            </Button>
          )}

          {order.status === "delivered" &&
            (existingReturn ? (
              <div className="mt-6 space-y-2 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Return request</span>
                  <ReturnStatusBadge status={existingReturn.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {existingReturn.reason}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/returns">View return</Link>
                </Button>
              </div>
            ) : (
              <Button
                className="mt-6"
                onClick={openReturnDialog}
                variant="outline"
              >
                Request a return
              </Button>
            ))}
        </section>
      </div>

      <Dialog onOpenChange={setReturnDialogOpen} open={returnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a return</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitReturn}>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div className="flex items-center gap-3" key={item.id}>
                  <Checkbox
                    checked={selectedItemIds.has(item.id)}
                    id={`return-item-${item.id}`}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <Label
                    className="flex-1 font-normal"
                    htmlFor={`return-item-${item.id}`}
                  >
                    {item.productName}{" "}
                    <span className="text-muted-foreground">
                      (purchased {item.quantity})
                    </span>
                  </Label>
                  <Input
                    className="w-20"
                    disabled={!selectedItemIds.has(item.id)}
                    max={item.quantity}
                    min={1}
                    onChange={(event) =>
                      setReturnQuantities({
                        ...returnQuantities,
                        [item.id]: Number(event.target.value),
                      })
                    }
                    type="number"
                    value={returnQuantities[item.id] ?? item.quantity}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for return</Label>
              <textarea
                className={`
                  flex min-h-20 w-full rounded-md border border-input
                  bg-transparent px-3 py-2 text-sm shadow-xs outline-none
                  focus-visible:border-ring focus-visible:ring-[3px]
                  focus-visible:ring-ring/50
                `}
                id="reason"
                onChange={(event) => setReturnReason(event.target.value)}
                required
                value={returnReason}
              />
            </div>
            <DialogFooter>
              <Button disabled={isSubmittingReturn} type="submit">
                {isSubmittingReturn ? "Submitting…" : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
