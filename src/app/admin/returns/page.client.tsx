"use client";

import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import type { ReturnStatus } from "~/db/schema/returns/types";

import { ReturnStatusBadge } from "~/ui/components/return-status-badge";
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

interface AdminReturnRow {
  createdAt: string;
  id: string;
  orderId: string;
  reason: string;
  refundAmount: number;
  status: ReturnStatus;
  user: null | { email: string; id: string; name: string };
}

/** Statuses an admin may move a return to, from its current status. */
const ADMIN_NEXT_STATUS_OPTIONS: Partial<Record<ReturnStatus, ReturnStatus[]>> =
  {
    approved: ["refunded"],
    requested: ["approved", "rejected"],
  };

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

export default function AdminReturnsPageClient() {
  const [returns, setReturns] = React.useState<AdminReturnRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<null | string>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadReturns() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/returns");
        const data = (await response.json()) as {
          error?: string;
          returns: AdminReturnRow[];
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load returns");
        }

        if (!cancelled) setReturns(data.returns);
      } catch (error) {
        console.error("Error loading returns:", error);
        toast.error("Couldn't load returns");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadReturns();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = React.useCallback(
    async (returnId: string, nextStatus: ReturnStatus) => {
      setUpdatingId(returnId);
      try {
        const response = await fetch(`/api/admin/returns/${returnId}`, {
          body: JSON.stringify({ status: nextStatus }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
        const data = (await response.json()) as {
          error?: string;
          return?: { status: ReturnStatus };
        };

        if (!response.ok || !data.return) {
          throw new Error(data.error ?? "Failed to update return");
        }

        setReturns((prev) =>
          prev.map((returnRequest) =>
            returnRequest.id === returnId
              ? { ...returnRequest, status: data.return!.status }
              : returnRequest,
          ),
        );
        toast.success(`Return updated to "${nextStatus}"`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update return";
        toast.error(message);
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading returns…</p>;
  }

  if (returns.length === 0) {
    return <p className="text-sm text-muted-foreground">No returns yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Return</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Refund</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Update status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {returns.map((returnRequest) => {
          const nextOptions =
            ADMIN_NEXT_STATUS_OPTIONS[returnRequest.status] ?? [];

          return (
            <TableRow key={returnRequest.id}>
              <TableCell className="font-medium">
                #{returnRequest.id.slice(0, 8)}
              </TableCell>
              <TableCell>
                <Link
                  className="hover:underline"
                  href={`/orders/${returnRequest.orderId}`}
                >
                  #{returnRequest.orderId.slice(0, 8)}
                </Link>
              </TableCell>
              <TableCell>
                <div>{returnRequest.user?.name ?? "Unknown"}</div>
                <div className="text-xs text-muted-foreground">
                  {returnRequest.user?.email ?? "—"}
                </div>
              </TableCell>
              <TableCell>
                {DATE_FORMATTER.format(new Date(returnRequest.createdAt))}
              </TableCell>
              <TableCell className="max-w-[240px] truncate">
                {returnRequest.reason}
              </TableCell>
              <TableCell className="text-right">
                {CURRENCY_FORMATTER.format(returnRequest.refundAmount)}
              </TableCell>
              <TableCell>
                <ReturnStatusBadge status={returnRequest.status} />
              </TableCell>
              <TableCell className="text-right">
                {nextOptions.length > 0 ? (
                  <select
                    className={`
                      rounded-md border bg-transparent px-2 py-1 text-sm
                      disabled:opacity-50
                    `}
                    disabled={updatingId === returnRequest.id}
                    onChange={(event) =>
                      void handleStatusChange(
                        returnRequest.id,
                        event.target.value as ReturnStatus,
                      )
                    }
                    value={returnRequest.status}
                  >
                    <option value={returnRequest.status}>
                      {returnRequest.status}
                    </option>
                    {nextOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
