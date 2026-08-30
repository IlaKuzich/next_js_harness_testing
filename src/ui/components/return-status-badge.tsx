import type { ReturnStatus } from "~/db/schema/returns/types";

import { Badge } from "~/ui/primitives/badge";

const STATUS_LABELS: Record<ReturnStatus, string> = {
  approved: "Approved",
  cancelled: "Cancelled",
  refunded: "Refunded",
  rejected: "Rejected",
  requested: "Requested",
};

const STATUS_CLASSES: Record<ReturnStatus, string> = {
  approved: "border-transparent bg-blue-500/10 text-blue-600",
  cancelled: "border-transparent bg-muted text-muted-foreground",
  refunded: "border-transparent bg-emerald-500/10 text-emerald-600",
  rejected: "border-transparent bg-destructive/10 text-destructive",
  requested: "border-transparent bg-amber-500/10 text-amber-600",
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <Badge className={STATUS_CLASSES[status]} variant="outline">
      {STATUS_LABELS[status]}
    </Badge>
  );
}
