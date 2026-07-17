# architecture

a short map of how the codebase is laid out and how a request flows through it. for the day-to-day command list see [`README.md`](./README.md); for contributor workflow see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## stack at a glance

- **framework**: next.js 15 (app router) + react 19 + typescript 5.8
- **db**: postgres via drizzle-orm (single shared client, `db:push` schema sync)
- **auth**: better-auth (email, social, two-factor, polar plugin)
- **payments**: polar
- **storage**: uploadthing
- **package manager / runtime**: bun + turbopack

## import alias

`~/*` maps to `src/*`. shadcn aliases: components → `~/ui/components`, primitives → `~/ui/primitives`, utils → `~/lib/cn`.

## directory layout

```
src/
  app/            # routes (app router)
    api/          # route handlers — thin http adapters over the service layer
    <route>/      # page.tsx (server) + page.client.tsx (client) pairs
  api/            # server-side service layer (business logic, db access)
    orders/
    payments/
    reviews/
  db/
    index.ts      # single shared drizzle client (cached on globalThis in dev)
    schema/       # <domain>/{tables,relations,types}.ts, re-exported via barrel
  lib/            # auth, helpers, hooks, queries
  ui/             # components + primitives
  app.ts          # SEO_CONFIG, SYSTEM_CONFIG, ADMIN_CONFIG — edit to rebrand
```

## the three layers

the app keeps a deliberate separation between http, business logic, and data:

1. **route handlers** (`src/app/api/**/route.ts`) — authenticate the request, parse and validate the payload, call one service function, and map thrown errors to a status code. they hold no business logic.
2. **service layer** (`src/api/<domain>/service.ts`) — the real logic: validation, invariants, and all db access. services throw plain `Error`s with human-readable messages; the route above decides the status code.
3. **data layer** (`src/db`) — drizzle schema and the shared `db` client. relational queries (`db.query.x.findMany({ with: {...} })`) require an exported `relations()` object per domain.

a typical write request:

```
client → route handler → service function → db → back up the same path
         (auth + parse)   (validate + logic)  (drizzle)
```

## page pattern

routes under `src/app` split server and client concerns. `page.tsx` is a server component that does the auth check and data fetching, then renders a co-located `page.client.tsx` client component. some routes add `page.types.ts`. keep this split when adding routes.

## domains

| domain | service | tables | docs |
|--------|---------|--------|------|
| orders | `src/api/orders/service.ts` | `orders`, `order_items` | [docs/orders.md](./docs/orders.md) |
| reviews | `src/api/reviews/service.ts` | `reviews` | [docs/reviews.md](./docs/reviews.md) |
| payments | `src/api/payments/service.ts` | `polar_customer`, `polar_subscription` | [docs/payments.md](./docs/payments.md) |

## configuration

app-wide config lives in `src/app.ts` (`SEO_CONFIG`, `SYSTEM_CONFIG`, `ADMIN_CONFIG`, `DB_DEV_LOGGER`). edit these rather than hunting through components.

`src/db/schema/users/tables.ts` is **auto-generated** from `src/lib/auth.ts` by `bun db:auth` — never edit it by hand.
