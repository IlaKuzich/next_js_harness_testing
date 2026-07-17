import type { InferSelectModel } from "drizzle-orm";

import type { orderItemsTable, ordersTable } from "./tables";

export type Order = InferSelectModel<typeof ordersTable>;
export type OrderItem = InferSelectModel<typeof orderItemsTable>;
export type OrderStatus = Order["status"];
