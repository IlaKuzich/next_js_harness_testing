# orders

server-side order handling. business logic lives in `src/api/orders/service.ts`; the http
surface is a set of route handlers under `src/app/api`.

## data model

- `orders` — one row per order, with denormalized shipping fields and money totals.
- `order_items` — line items, each referencing an order.

money is stored to two decimal places; all arithmetic goes through an internal `round2`
helper to avoid floating-point drift.

## totals

`calculateOrderTotals(items)` derives the money on an order:

- **subtotal** — sum of `unitPrice * quantity` across items.
- **shipping** — free when the subtotal is `0` or at/above the free-shipping threshold
  (`100`); otherwise a flat `9.99`.
- **tax** — `8%` of the subtotal.
- **total** — subtotal + shipping + tax.

## status lifecycle

an order moves through a small state machine. allowed transitions:

```
pending  → paid, cancelled
paid     → shipped, cancelled
shipped  → delivered
delivered → (terminal)
cancelled → (terminal)
```

`updateOrderStatus(orderId, nextStatus, options?)` enforces these rules:

- throws if the order doesn't exist or the transition isn't allowed.
- re-applying the status an order already has is a **no-op**, not an error — so retried
  webhooks and double-clicked admin actions are safe.
- pass `options.expectedStatus` to assert the status you believe the order is in; the
  update is rejected if the order has since moved. the write itself is guarded on the
  observed status, so a racing transition loses instead of silently overwriting the winner.

customers can only self-cancel via `cancelOrderAsOwner`, which is limited to orders that
are still `pending`.

## endpoints

| method | path | purpose | auth |
|--------|------|---------|------|
| `POST` | `/api/orders` | create an order | user |
| `GET` | `/api/orders` | list the current user's orders | user |
| `GET` | `/api/orders/[id]` | fetch one of the user's orders | owner |
| `PATCH` | `/api/orders/[id]` | cancel an order (`{ "action": "cancel" }`) | owner |
| `GET` | `/api/admin/orders` | list every order | admin |
| `PATCH` | `/api/admin/orders/[id]` | set an order's status | admin |

the admin status endpoint accepts `{ "status": "...", "expectedStatus"?: "..." }`. both
fields are validated against the known statuses before reaching the service. a lost race
surfaces as a `400` with `"Order was updated by someone else, please retry"`.
