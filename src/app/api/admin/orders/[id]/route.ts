import { type NextRequest, NextResponse } from "next/server";

import type { OrderStatus } from "~/db/schema/orders/types";

import { updateOrderStatus } from "~/api/orders/service";
import { getCurrentUser } from "~/lib/auth";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as null | {
    status?: string;
  };

  if (
    !payload?.status ||
    !VALID_STATUSES.includes(payload.status as OrderStatus)
  ) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const order = await updateOrderStatus(id, payload.status as OrderStatus);
    return NextResponse.json({ order });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update order";
    console.error("Error updating order status:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
