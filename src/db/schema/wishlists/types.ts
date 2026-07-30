import type { InferSelectModel } from "drizzle-orm";

import type { wishlistItemsTable } from "./tables";

export type WishlistItem = InferSelectModel<typeof wishlistItemsTable>;
