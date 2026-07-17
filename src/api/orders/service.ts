import { and, desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import type { Order, OrderStatus } from "~/db/schema/orders/types";

import { db } from "~/db";
import { orderItemsTable, ordersTable } from "~/db/schema";

const TAX_RATE = 0.08;
const FREE_SHIPPING_THRESHOLD = 100;
const STANDARD_SHIPPING_COST = 9.99;

/**
 * Which statuses an order may move to from its current status. Anything
 * not listed here (including "cancelled") is a terminal state.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  cancelled: [],
  delivered: [],
  paid: ["shipped", "cancelled"],
  pending: ["paid", "cancelled"],
  shipped: ["delivered"],
};

export interface CreateOrderInput {
  items: OrderLineInput[];
  shippingAddress: ShippingAddressInput;
  userId: string;
}

export interface OrderLineInput {
  productId: string;
  productImage: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ShippingAddressInput {
  city: string;
  country: string;
  line1: string;
  line2?: string;
  name: string;
  postalCode: string;
  state: string;
}

export function calculateOrderTotals(items: OrderLineInput[]) {
  const subtotal = round2(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );
  const shippingCost =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : STANDARD_SHIPPING_COST;
  const tax = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + shippingCost + tax);

  return { shippingCost, subtotal, tax, total };
}

/**
 * Cancel an order on behalf of its owner. Only orders that are still
 * "pending" may be self-cancelled by the customer.
 */
export async function cancelOrderAsOwner(orderId: string, userId: string) {
  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, orderId),
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.userId !== userId) {
    throw new Error("You can only cancel your own orders");
  }

  if (order.status !== "pending") {
    throw new Error("Only pending orders can be cancelled");
  }

  return updateOrderStatus(orderId, "cancelled", { expectedStatus: "pending" });
}

/**
 * Create an order and its line items from the given cart snapshot.
 * Throws if the cart is empty or any line has an invalid quantity/price.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { items, shippingAddress, userId } = input;

  if (items.length === 0) {
    throw new Error("Cannot place an order with no items");
  }

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error(`Invalid quantity for product "${item.productId}"`);
    }
    if (item.unitPrice < 0) {
      throw new Error(`Invalid price for product "${item.productId}"`);
    }
  }

  const { shippingCost, subtotal, tax, total } = calculateOrderTotals(items);
  const now = new Date();
  const orderId = uuidv4();

  await db.insert(ordersTable).values({
    createdAt: now,
    id: orderId,
    shippingCity: shippingAddress.city,
    shippingCost,
    shippingCountry: shippingAddress.country,
    shippingLine1: shippingAddress.line1,
    shippingLine2: shippingAddress.line2,
    shippingName: shippingAddress.name,
    shippingPostalCode: shippingAddress.postalCode,
    shippingState: shippingAddress.state,
    subtotal,
    tax,
    total,
    updatedAt: now,
    userId,
  });

  await db.insert(orderItemsTable).values(
    items.map((item) => ({
      id: uuidv4(),
      lineTotal: round2(item.unitPrice * item.quantity),
      orderId,
      productId: item.productId,
      productImage: item.productImage,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  );

  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error("Failed to load order after creation");
  }
  return order;
}

/** List every order in the system, newest first, with line items and buyer. */
export async function getAllOrders() {
  return db.query.ordersTable.findMany({
    orderBy: desc(ordersTable.createdAt),
    with: {
      items: true,
      user: { columns: { email: true, id: true, name: true } },
    },
  });
}

/** Get a single order with its line items, or null if it doesn't exist. */
export async function getOrderById(orderId: string) {
  return db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, orderId),
    with: { items: true },
  });
}

/** List a user's orders, newest first, with line items. */
export async function getOrdersForUser(userId: string) {
  return db.query.ordersTable.findMany({
    orderBy: desc(ordersTable.createdAt),
    where: eq(ordersTable.userId, userId),
    with: { items: true },
  });
}

export interface UpdateOrderStatusOptions {
  /**
   * Status the caller believes the order is currently in. When given, the
   * update is rejected unless the order still has that status, so two
   * concurrent transitions can't both win.
   */
  expectedStatus?: OrderStatus;
}

/**
 * Move an order to a new status. Throws if the order doesn't exist, the
 * transition isn't allowed from its current status, or the order moved out
 * from under the caller's `expectedStatus`.
 *
 * Re-applying the status an order already has is a no-op rather than an
 * error, so retried webhooks and double-clicked admin actions stay safe.
 */
export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  options: UpdateOrderStatusOptions = {},
) {
  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, orderId),
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (options.expectedStatus && order.status !== options.expectedStatus) {
    throw new Error(
      `Order is "${order.status}", expected "${options.expectedStatus}"`,
    );
  }

  if (order.status === nextStatus) {
    return order;
  }

  const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[order.status];
  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new Error(
      `Cannot move order from "${order.status}" to "${nextStatus}"`,
    );
  }

  // guard on the status we read above so a racing transition loses instead of
  // silently overwriting the winner
  const changed = await db
    .update(ordersTable)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(
      and(eq(ordersTable.id, orderId), eq(ordersTable.status, order.status)),
    )
    .returning({ id: ordersTable.id });

  if (changed.length === 0) {
    throw new Error("Order was updated by someone else, please retry");
  }

  const updated = await getOrderById(orderId);
  if (!updated) {
    throw new Error("Failed to load order after update");
  }
  return updated;
}

/** Round to 2 decimal places, avoiding floating point drift. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
