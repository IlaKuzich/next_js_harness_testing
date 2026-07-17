import type { OrderStatus } from "~/db/schema/orders/types";

import { Badge } from "~/ui/primitives/badge";

const STATUS_LABELS: Record<OrderStatus, string> = {
  cancelled: "Cancelled",
  delivered: "Delivered",
  paid: "Paid",
  pending: "Pending",
  shipped: "Shipped",
};

const STATUS_CLASSES: Record<OrderStatus, string> = {
  cancelled: "border-transparent bg-destructive/10 text-destructive",
  delivered: "border-transparent bg-emerald-500/10 text-emerald-600",
  paid: "border-transparent bg-blue-500/10 text-blue-600",
  pending: "border-transparent bg-amber-500/10 text-amber-600",
  shipped: "border-transparent bg-violet-500/10 text-violet-600",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge className={STATUS_CLASSES[status]} variant="outline">
      {STATUS_LABELS[status]}
    </Badge>
  );
}
