import { type NextRequest, NextResponse } from "next/server";

import { cancelOrderAsOwner, getOrderById } from "~/api/orders/service";
import { getCurrentUser } from "~/lib/auth";

export async function GET(
  _request: NextRequest,
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

  try {
    const order = await getOrderById(id);

    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }
}

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
    action?: string;
  };

  if (payload?.action !== "cancel") {
    return NextResponse.json(
      { error: 'Only the "cancel" action is supported' },
      { status: 400 },
    );
  }

  try {
    const order = await cancelOrderAsOwner(id, user.id);
    return NextResponse.json({ order });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel order";
    console.error("Error cancelling order:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
