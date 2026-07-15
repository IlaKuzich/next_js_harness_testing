import type { InferSelectModel } from "drizzle-orm";

import type { reviewsTable } from "./tables";

export type Review = InferSelectModel<typeof reviewsTable>;
