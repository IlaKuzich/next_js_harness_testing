# payments

subscription and customer handling on top of [polar](https://polar.sh). the better-auth
polar plugin (products, checkout, webhooks) is configured in `src/lib/auth.ts`; the sdk
calls and db syncing live in `src/api/payments/service.ts`.

> product ids in `src/lib/auth.ts` are placeholders (`pro-plan`, `premium-plan`) — replace
> them with real polar dashboard ids before going live.

## configuration

the polar client reads two environment variables:

- `POLAR_ACCESS_TOKEN` — api token.
- `POLAR_ENVIRONMENT` — `production` or `sandbox` (defaults to `production`).

## data model

- `polar_customer` — maps a local `userId` to a polar `customerId`.
- `polar_subscription` — one row per subscription, tracking `subscriptionId`, `productId`,
  and `status`.

## service functions

- `getCustomerByUserId(userId)` — the local polar customer row, or `null`.
- `getCustomerState(userId)` — live customer state from the polar api, or `null` on a
  missing customer or api error.
- `createCustomer(userId, email, name?)` — creates the customer in polar and stores the
  reference locally.
- `getUserSubscriptions(userId)` — all subscription rows for a user.
- `hasActiveSubscription(userId)` — true if any subscription is `active`.
- `syncSubscription(...)` — upsert used by webhook handling: updates the status of an
  existing subscription or inserts a new row.
- `getCheckoutUrl(customerId, productSlug)` — a polar checkout url, or `null` on error.

## endpoints

| method | path | purpose |
|--------|------|---------|
| `GET` | `/api/payments/customer-state` | current user's polar customer state |
| `GET` | `/api/payments/subscriptions` | current user's subscriptions |

## error handling

the service catches polar sdk errors, logs them, and returns `null` (for reads) or
re-throws (for writes such as `createCustomer` / `syncSubscription`) so the caller can
decide how to respond.
