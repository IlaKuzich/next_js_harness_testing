import { NextResponse } from "next/server";

import { getAllOrders } from "~/api/orders/service";
import { getCurrentUser } from "~/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const orders = await getAllOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}
