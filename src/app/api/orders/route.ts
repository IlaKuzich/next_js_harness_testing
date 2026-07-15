import { type NextRequest, NextResponse } from "next/server";

import type {
  OrderLineInput,
  ShippingAddressInput,
} from "~/api/orders/service";

import { createOrder, getOrdersForUser } from "~/api/orders/service";
import { getCurrentUser } from "~/lib/auth";

const MAX_ITEMS_PER_ORDER = 50;

interface CreateOrderPayload {
  items?: OrderLineInput[];
  shippingAddress?: ShippingAddressInput;
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const orders = await getOrdersForUser(user.id);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
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

  const payload = (await request
    .json()
    .catch(() => null)) as CreateOrderPayload | null;

  const validationError = validatePayload(payload);
  if (validationError || !payload) {
    return NextResponse.json(
      { error: validationError ?? "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    const order = await createOrder({
      items: payload.items ?? [],
      shippingAddress: payload.shippingAddress as ShippingAddressInput,
      userId: user.id,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create order";
    console.error("Error creating order:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function validatePayload(payload: CreateOrderPayload | null): null | string {
  if (!payload) return "Invalid request body";

  const { items, shippingAddress } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    return "At least one item is required";
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    return `Orders are limited to ${MAX_ITEMS_PER_ORDER} line items`;
  }
  for (const item of items) {
    if (
      typeof item.productId !== "string" ||
      typeof item.productName !== "string" ||
      typeof item.productImage !== "string" ||
      typeof item.quantity !== "number" ||
      typeof item.unitPrice !== "number"
    ) {
      return "Each item must include productId, productName, productImage, quantity, and unitPrice";
    }
  }

  if (
    !shippingAddress ||
    typeof shippingAddress.name !== "string" ||
    typeof shippingAddress.line1 !== "string" ||
    typeof shippingAddress.city !== "string" ||
    typeof shippingAddress.state !== "string" ||
    typeof shippingAddress.postalCode !== "string" ||
    typeof shippingAddress.country !== "string"
  ) {
    return "A complete shipping address is required";
  }

  return null;
}
