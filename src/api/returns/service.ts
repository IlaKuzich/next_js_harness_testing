import { and, desc, eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import type { ReturnStatus } from "~/db/schema/returns/types";

import { db } from "~/db";
import { ordersTable, returnItemsTable, returnsTable } from "~/db/schema";

const RETURN_WINDOW_DAYS = 30;
const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

/**
 * Which statuses a return may move to from its current status. Rejected,
 * refunded, and cancelled are terminal states.
 */
const ALLOWED_RETURN_STATUS_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> =
  {
    approved: ["refunded"],
    cancelled: [],
    refunded: [],
    rejected: [],
    requested: ["approved", "rejected", "cancelled"],
  };

const returnQueryOptions = {
  items: { with: { orderItem: true } },
  order: true,
} as const;

export interface RequestReturnInput {
  items: { orderItemId: string; quantity: number }[];
  orderId: string;
  reason: string;
  userId: string;
}

/**
 * Cancel a return on behalf of its owner. Only requests still in the
 * "requested" state may be self-cancelled by the customer.
 */
export async function cancelReturnAsOwner(returnId: string, userId: string) {
  const existing = await db.query.returnsTable.findFirst({
    where: eq(returnsTable.id, returnId),
  });

  if (!existing) {
    throw new Error("Return not found");
  }

  if (existing.userId !== userId) {
    throw new Error("You can only cancel your own return requests");
  }

  if (existing.status !== "requested") {
    throw new Error("Only pending return requests can be cancelled");
  }

  return updateReturnStatus(returnId, "cancelled");
}

/** List every return in the system, newest first, with items and buyer. */
export async function getAllReturns() {
  return db.query.returnsTable.findMany({
    orderBy: desc(returnsTable.createdAt),
    with: {
      ...returnQueryOptions,
      user: { columns: { email: true, id: true, name: true } },
    },
  });
}

/** Get a single return with its items, or null if it doesn't exist. */
export async function getReturnById(returnId: string) {
  return db.query.returnsTable.findFirst({
    where: eq(returnsTable.id, returnId),
    with: returnQueryOptions,
  });
}

/** List the returns filed against a specific order, newest first. */
export async function getReturnsForOrder(orderId: string) {
  return db.query.returnsTable.findMany({
    orderBy: desc(returnsTable.createdAt),
    where: eq(returnsTable.orderId, orderId),
    with: returnQueryOptions,
  });
}

/** List a user's return requests, newest first. */
export async function getReturnsForUser(userId: string) {
  return db.query.returnsTable.findMany({
    orderBy: desc(returnsTable.createdAt),
    where: eq(returnsTable.userId, userId),
    with: returnQueryOptions,
  });
}

/**
 * File a return request for a delivered order. Validates the order is
 * eligible, the requested items/quantities belong to it, and that there
 * isn't already an active return in flight for it.
 */
export async function requestReturn(input: RequestReturnInput) {
  const { items, orderId, reason, userId } = input;

  const trimmedReason = reason.trim();
  if (trimmedReason.length < MIN_REASON_LENGTH) {
    throw new Error("Reason must be at least 10 characters");
  }

  if (trimmedReason.length > MAX_REASON_LENGTH) {
    throw new Error("Reason must be at most 500 characters");
  }

  if (items.length === 0) {
    throw new Error("Select at least one item to return");
  }

  const order = await db.query.ordersTable.findFirst({
    where: eq(ordersTable.id, orderId),
    with: { items: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.userId !== userId) {
    throw new Error("You can only request returns for your own orders");
  }

  if (order.status !== "delivered") {
    throw new Error("Only delivered orders are eligible for a return");
  }

  const deliveredAt = order.updatedAt.getTime();
  const windowMs = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() - deliveredAt > windowMs) {
    throw new Error(
      `Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery`,
    );
  }

  const existingActive = await db.query.returnsTable.findFirst({
    where: and(
      eq(returnsTable.orderId, orderId),
      inArray(returnsTable.status, ["requested", "approved"]),
    ),
  });

  if (existingActive) {
    throw new Error("This order already has a return in progress");
  }

  const orderItemsById = new Map(order.items.map((item) => [item.id, item]));
  let refundAmount = 0;

  for (const line of items) {
    const orderItem = orderItemsById.get(line.orderItemId);

    if (!orderItem) {
      throw new Error("One of the selected items is not part of this order");
    }

    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error(`Invalid return quantity for "${orderItem.productName}"`);
    }

    if (line.quantity > orderItem.quantity) {
      throw new Error(
        `Cannot return more than the ${orderItem.quantity} purchased of ` +
          `"${orderItem.productName}"`,
      );
    }

    refundAmount += orderItem.unitPrice * line.quantity;
  }

  const now = new Date();
  const returnId = uuidv4();

  await db.insert(returnsTable).values({
    createdAt: now,
    id: returnId,
    orderId,
    reason: trimmedReason,
    refundAmount: round2(refundAmount),
    updatedAt: now,
    userId,
  });

  await db.insert(returnItemsTable).values(
    items.map((line) => ({
      id: uuidv4(),
      orderItemId: line.orderItemId,
      quantity: line.quantity,
      returnId,
    })),
  );

  const created = await getReturnById(returnId);
  if (!created) {
    throw new Error("Failed to load return after creation");
  }
  return created;
}

/**
 * Move a return to a new status. Throws if the return doesn't exist or the
 * transition isn't allowed from its current status.
 */
export async function updateReturnStatus(
  returnId: string,
  nextStatus: ReturnStatus,
  adminNote?: string,
) {
  const existing = await db.query.returnsTable.findFirst({
    where: eq(returnsTable.id, returnId),
  });

  if (!existing) {
    throw new Error("Return not found");
  }

  const allowedNextStatuses =
    ALLOWED_RETURN_STATUS_TRANSITIONS[existing.status];
  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new Error(
      `Cannot move return from "${existing.status}" to "${nextStatus}"`,
    );
  }

  await db
    .update(returnsTable)
    .set({
      adminNote: adminNote ?? existing.adminNote,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(returnsTable.id, returnId));

  const updated = await getReturnById(returnId);
  if (!updated) {
    throw new Error("Failed to load return after update");
  }
  return updated;
}

/** Round to 2 decimal places, avoiding floating point drift. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
