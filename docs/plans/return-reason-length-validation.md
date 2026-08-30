# Implementation Plan: Return reason length validation

Small, self-contained fix — no spec doc, no architecture-review/plan-verifier cycle.
Single task, single owner, no shared contracts.

## Why

`requestReturn` in `src/api/returns/service.ts` only checks the reason isn't
empty. A one-character reason (or a 5000-character essay) is currently
accepted. Add a sane length window and surface it in the request form.

## Task 1 — Enforce reason length window

**Owns:**
- `src/api/returns/service.ts`
- `src/app/orders/[id]/page.client.tsx`

**Steps:**
1. In `src/api/returns/service.ts`, add constants `MIN_REASON_LENGTH = 10` and
   `MAX_REASON_LENGTH = 500` near `RETURN_WINDOW_DAYS`. Replace the
   `if (!reason.trim())` check in `requestReturn` with a check against the
   trimmed length: throw `"Reason must be at least 10 characters"` when below
   the minimum, `"Reason must be at most 500 characters"` when above the
   maximum (check order: empty/too-short first, too-long second).
2. In `src/app/orders/[id]/page.client.tsx`, on the return-request `textarea`
   (id="reason"): add `maxLength={500}` and a small helper line below it
   showing `{returnReason.trim().length}/500` (muted text, same style as
   other helper text in this file). Disable the submit button (in addition to
   its existing `isSubmittingReturn` condition) when
   `returnReason.trim().length < 10`.

**Verify:**
- `bun check` passes (typecheck + lint + biome + knip).
- Manually trace: a 5-char reason is rejected by both the disabled button and
  (if bypassed) the service throw; a 501-char reason is blocked by
  `maxLength` client-side and would be rejected server-side too.

No DB schema change, no new API contract, no cross-package impact —
architecture-review and plan-verifier are intentionally skipped for this task.
