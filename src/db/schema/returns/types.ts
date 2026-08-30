import type { InferSelectModel } from "drizzle-orm";

import type { returnItemsTable, returnsTable } from "./tables";

export type OrderReturn = InferSelectModel<typeof returnsTable>;
export type ReturnItem = InferSelectModel<typeof returnItemsTable>;
export type ReturnStatus = OrderReturn["status"];
