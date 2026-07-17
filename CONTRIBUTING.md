# contributing

thanks for taking the time to contribute. this guide covers the local setup, the conventions the codebase enforces, and how to get a change merged.

## prerequisites

- [git](https://git-scm.com), [node.js](https://nodejs.org), and [bun](https://bun.sh)
- a postgres database (local or a hosted one like [neon](https://neon.tech))

## local setup

```bash
git clone <your-fork-url>
cd next_js_harness_testing
bun install
copy .env.example .env   # then fill in the required values
bun db:push              # sync the drizzle schema to your database
bun dev                  # start the dev server (turbopack)
```

## commands

| command | purpose |
|---------|---------|
| `bun dev` | start dev server (turbopack) |
| `bun run build` | production build |
| `bun check` | full gate: `tsc --noEmit` + eslint + biome + knip (auto-fixes) |
| `bun tests` | run tests in `./.tests` |
| `bun db:push` | apply drizzle schema to the database |
| `bun db:studio` | open drizzle studio |
| `bun db:auth` | regenerate better-auth tables |

there is no standalone lint/typecheck script — use `bun check`. note that `bun run build` does **not** lint (`next.config.ts` sets `eslint.ignoreDuringBuilds: true`), so run `bun check` separately before opening a pr.

## conventions

these are enforced by `bun check`, so a change that ignores them won't pass ci:

- **sorted keys and imports** — object keys and imports are kept in natural/alphabetical order (`eslint-plugin-perfectionist`).
- **lowercase comments** — comments are lowercase (except code identifiers) and explain the *why*, not the *what*. informal tone is fine.
- **no narration comments** — when cleaning up, don't add comments describing what changed; the diff already shows it.
- **formatting** is split across eslint + biome; `bun check` runs both with `--fix`.

## adding a feature

follow the existing layering (see [`ARCHITECTURE.md`](./ARCHITECTURE.md)):

1. put business logic and db access in a service under `src/api/<domain>/service.ts`. throw plain `Error`s with clear messages.
2. keep route handlers (`src/app/api/**/route.ts`) thin — authenticate, parse, call one service function, map errors to status codes.
3. for new pages, split `page.tsx` (server) and `page.client.tsx` (client).
4. for new schema, add `src/db/schema/<domain>/{tables,relations,types}.ts` and re-export through the barrel. relational queries need an exported `relations()` object.

## commit messages

- write a concise, imperative subject line ("add order cancellation guard", not "added" / "adds").
- explain the *why* in the body when the change isn't self-evident.
- keep unrelated changes in separate commits.

## pull requests

- branch off `main` and open the pr against `main`.
- run `bun check` and `bun tests` locally first.
- describe what changed and, for changes to shared helpers, note the blast radius (which callers and endpoints are affected).
- keep the diff focused — one logical change per pr.
