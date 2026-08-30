"use client";

import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import type { ReturnStatus } from "~/db/schema/returns/types";

import { ReturnStatusBadge } from "~/ui/components/return-status-badge";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/ui/primitives/card";
import { Separator } from "~/ui/primitives/separator";

/* -------------------------------------------------------------------------- */
/*                               Type declarations                            */
/* -------------------------------------------------------------------------- */

interface ReturnItemSummary {
  id: string;
  orderItem: {
    productImage: string;
    productName: string;
  };
  quantity: number;
}

interface ReturnSummary {
  createdAt: string;
  id: string;
  items: ReturnItemSummary[];
  orderId: string;
  reason: string;
  refundAmount: number;
  status: ReturnStatus;
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

export default function ReturnsPageClient() {
  const [returns, setReturns] = React.useState<ReturnSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [cancellingId, setCancellingId] = React.useState<null | string>(null);

  const loadReturns = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/returns");
      const data = (await response.json()) as {
        error?: string;
        returns?: ReturnSummary[];
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load returns");
      }

      setReturns(data.returns ?? []);
    } catch (error) {
      console.error("Error loading returns:", error);
      toast.error("Couldn't load your returns");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadReturns();
  }, [loadReturns]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      const response = await fetch(`/api/returns/${id}`, {
        body: JSON.stringify({ action: "cancel" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to cancel return");
      }

      toast.success("Return request cancelled");
      await loadReturns();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel return";
      toast.error(message);
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading returns…</p>;
  }

  if (returns.length === 0) {
    return (
      <Card>
        <CardContent
          className={`
            flex flex-col items-center gap-2 py-12 text-center
            text-muted-foreground
          `}
        >
          <p>You haven&apos;t requested any returns yet.</p>
          <Button asChild variant="outline">
            <Link href="/orders">View your orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {returns.map((returnRequest) => (
        <Card key={returnRequest.id}>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">
                Return for order{" "}
                <Link
                  className="hover:underline"
                  href={`/orders/${returnRequest.orderId}`}
                >
                  #{returnRequest.orderId.slice(0, 8)}
                </Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Requested{" "}
                {DATE_FORMATTER.format(new Date(returnRequest.createdAt))}
              </p>
            </div>
            <ReturnStatusBadge status={returnRequest.status} />
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-sm text-muted-foreground">
              {returnRequest.items.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.orderItem.productName}
                </li>
              ))}
            </ul>
            <p className="text-sm">
              <span className="text-muted-foreground">Reason: </span>
              {returnRequest.reason}
            </p>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Refund amount</span>
              <span className="font-semibold">
                {CURRENCY_FORMATTER.format(returnRequest.refundAmount)}
              </span>
            </div>
            {returnRequest.status === "requested" && (
              <Button
                disabled={cancellingId === returnRequest.id}
                onClick={() => handleCancel(returnRequest.id)}
                size="sm"
                variant="outline"
              >
                {cancellingId === returnRequest.id
                  ? "Cancelling…"
                  : "Cancel request"}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
