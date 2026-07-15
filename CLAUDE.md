# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Relivator is a Next.js 15 ecommerce starter template (App Router, React 19, TypeScript 5.8). Package manager is **bun**. Runtime uses Turbopack for dev.

## Commands

| command | purpose |
|---------|---------|
| `bun dev` | start dev server (Turbopack) |
| `bun run build` | production build |
| `bun check` | full gate: `tsc --noEmit && eslint --cache --fix . && biome check --fix --unsafe . && knip` |
| `bun tests` | run tests in `./.tests` (bun's built-in test runner) |
| `bun db:push` | apply Drizzle schema to the database (no migration files) |
| `bun db:studio` | open Drizzle Studio |
| `bun db:auth` | regenerate better-auth tables (see Auth below) |
| `bun ui` | add a shadcn/ui component (`bunx shadcn@latest add`) |

Run a single test with bun's filter: `bun test ./.tests/payments.test.ts`.

There is no standalone lint/typecheck script — use `bun check` (it auto-fixes). Note `next.config.ts` sets `eslint.ignoreDuringBuilds: true`, so `bun run build` does **not** lint; run `bun check` separately.

## Architecture

**Import alias:** `~/*` maps to `src/*` (tsconfig). shadcn aliases: components → `~/ui/components`, primitives → `~/ui/primitives`, utils → `~/lib/cn`.

**Config lives in `src/app.ts`** — `SEO_CONFIG`, `SYSTEM_CONFIG` (post-auth redirects, repo info), `ADMIN_CONFIG`, `DB_DEV_LOGGER`. Edit these to rebrand/reconfigure rather than hunting through components.

### Page pattern
Routes under `src/app` split server and client concerns: `page.tsx` is a server component (does auth checks, data fetching) that renders a co-located `page.client.tsx` client component. Some also have `page.types.ts`. Follow this split when adding routes.

### Auth (better-auth)
- Server config: `src/lib/auth.ts`. Exposes `auth`, plus `getCurrentUser()` and `getCurrentUserOrRedirect()` helpers for server components.
- Client: `src/lib/auth-client.ts`. Exposes `signIn/signOut/signUp/useSession` and the `useCurrentUser` / `useCurrentUserOrRedirect` hooks (these return raw session data only — use the server `getCurrentUser*` for DB-backed data).
- Plugins: `twoFactor` and Polar. Social providers (GitHub, Google) are conditionally enabled only when their env credentials are present.
- **`src/db/schema/users/tables.ts` is auto-generated** from `auth.ts` by `bun db:auth` — do not edit it directly. After changing user/auth fields in `auth.ts`, run `bun db:auth` (it runs the better-auth CLI, then post-processes to rename tables to the `*Table` convention), then `bun db:push`.

### Database (Drizzle + Postgres)
- Single shared client exported from `src/db/index.ts` as `db` (cached on `globalThis` in dev to survive HMR). Never create a second Drizzle instance.
- Schema lives in `src/db/schema/<domain>/{tables,relations,types}.ts` and is re-exported through the barrel `src/db/schema/index.ts` (the file `drizzle.config.ts` points to). Domains: `users`, `uploads`, `payments`.
- For relational queries (`db.query.x.findMany({ with: {...} })`) you **must** define and export a `relations()` object, not just `.references()` — see `.cursor/rules/drizzle-orm.mdc`.
- Uses `db:push` (schema sync), not generated migration files.

### Payments (Polar)
- better-auth Polar plugin config (products, checkout, webhooks) is in `src/lib/auth.ts`. Product IDs there are placeholders (`pro-plan`, `premium-plan`) — replace with real Polar dashboard IDs.
- Business logic / Polar SDK calls: `src/api/payments/service.ts`. Tables: `polar_customer`, `polar_subscription`.
- API routes: `src/app/api/payments/{customer-state,subscriptions}/route.ts`.

### Uploads (UploadThing)
- File router (routes, per-route auth middleware, DB insert on complete): `src/app/api/uploadthing/core.ts`. Media fetched via `src/app/api/media/route.ts`. See `.cursor/rules/uploadthing.mdc` for the end-to-end flow when adding media types.

## Conventions

- **Object keys and imports are sorted** (`eslint-plugin-perfectionist`, natural order). New code should keep alphabetical ordering to pass `bun check`.
- Formatting/linting is split across ESLint + Biome; `bun check` runs both with `--fix`.
- **Comments must be lowercase** (except code identifiers) and explain the "why," not the "what." Informal tone is allowed. Full rules in `.cursor/rules/comments.mdc`.
- When cleaning up code, don't add comments narrating what changed — the diff shows it.
- Several features are marked work-in-progress in the README (i18n, email, oRPC, react-form) and may be partial.
