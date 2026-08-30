import { type NextRequest, NextResponse } from "next/server";

import {
  getReturnsForOrder,
  getReturnsForUser,
  requestReturn,
} from "~/api/returns/service";
import { getCurrentUser } from "~/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const orderId = request.nextUrl.searchParams.get("orderId");

  try {
    const returns = orderId
      ? (await getReturnsForOrder(orderId)).filter(
          (returnRequest) => returnRequest.userId === user.id,
        )
      : await getReturnsForUser(user.id);

    return NextResponse.json({ returns });
  } catch (error) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as null | Partial<{
    items: { orderItemId?: string; quantity?: number }[];
    orderId: string;
    reason: string;
  }>;

  if (
    !payload ||
    typeof payload.orderId !== "string" ||
    typeof payload.reason !== "string" ||
    !Array.isArray(payload.items)
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const items = payload.items.filter(
    (item): item is { orderItemId: string; quantity: number } =>
      typeof item.orderItemId === "string" &&
      typeof item.quantity === "number",
  );

  if (items.length !== payload.items.length) {
    return NextResponse.json(
      { error: "Each item requires an orderItemId and quantity" },
      { status: 400 },
    );
  }

  try {
    const returnRequest = await requestReturn({
      items,
      orderId: payload.orderId,
      reason: payload.reason,
      userId: user.id,
    });

    return NextResponse.json({ return: returnRequest }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to request return";
    console.error("Error requesting return:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
