# Run retro — return reason length validation (2026-08-31)

**Verdict:** The chain worked — clean single-file-ownership implementation, zero rework — but
cost ~$5.98 for a 2-file/~15-line change, almost two-thirds of it in the orchestrator's own
reasoning and skill-loading rather than in the implementer that wrote the code, and the
pipeline's own pre-push gate could not complete because of a structural conflict with the
runtime's self-approval guard.

## What ran

Window: 21:48–22:05 UTC (17.2 min) · Agents: 1 cold spawn, 0 warm resumes
Tokens: 9.2M total — orchestrator 5.3M, subagent 3.9M
Est. cost: $5.98 — orchestrator $3.78, subagent $2.20

| # | Agent | Model | Task | Start | Min | Turns | Tokens | Cost | Resumes | Tools |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | sdd-engineering:implementer | sonnet-5 | Implement return reason length validation | 22:00 | 2.7 | 53 | 3.9M | $2.20 | — | Bash:20 Read:4 Edit:4 |

**Execution shape:** one wave, one agent (22:00–22:03).
Orchestrator's own tools: Bash:17 Skill:8 Read:5 AskUserQuestion:1 Write:1 Agent:1.
**Overlap:** none — no file written or read by two agents; ownership was trivially disjoint
with a single agent in flight.

## Where the run departed from the design

- **No `run-plan`, no gates, by deliberate scope decision — not a breach.** Given the user
  asked for a small, fast feature, the orchestrator skipped `spec-creator`,
  `implementation-planner`, `plan-verifier` (Mode A/B), and `architecture-review` entirely,
  writing the Implementation Plan itself and spawning a single `implementer` directly. This
  matches the user's explicit ask and the README's "match gate weight to actual risk"
  principle — flagged here for the ledger, not as a defect.
- **`pr-self-review`'s gate artifact was never written.** The skill ran, produced a PASS
  verdict with 0 blockers in the transcript, but the write to
  `.claude/.pr-self-review-state.json` was denied by the runtime's auto-mode classifier as
  "self-approval" (the same agent implemented, reviewed, and would have signed its own
  passing verdict). Net effect: the human-facing report says PASS, but no artifact backs it,
  so the actual `git push` gate remains closed. This is not a false pass — the hook still
  protects the push — but it does mean the review's conclusion and the recorded state
  disagree, which is worth surfacing rather than treating as "reviewed."

## Where the design itself was wrong

- **No documented threshold for "too small to spawn."** `workflow-retro`'s own judgment
  table asks, after the fact, whether an agent "was too small to spawn — a short, few-turn
  agent whose whole job was a config tweak — cheaper inline." This run is close to that case:
  a fully-specified, line-level plan for a 2-file/~15-line change was handed to a fresh
  `implementer`, which spent 53 turns and $2.20 partly re-deriving environment state (it
  had to install `bun` and run `bun install` before it could even run `bun check`, work the
  orchestrator's own shell had already paid for earlier in the same session). The README's
  "Orchestrating economically" section says "don't spawn a cold agent for small work" but
  gives the orchestrator no rule to apply *before* spawning — only `workflow-retro` can catch
  it, after the money is spent. Worth adding a concrete size heuristic (e.g. "≤2 files and
  the plan is already line-level ⇒ edit directly, don't spawn") to the README rather than
  leaving it to retrospective judgment only.
- **`pr-self-review`'s design assumes a reviewer distinct from the implementer, but the
  plugin only ever has the orchestrator play both roles.** The skill's own workflow has the
  orchestrator invoke domain skills, judge the diff, and write its own passing verdict — that
  is definitionally self-certification whenever the orchestrator is also the one who spawned
  (or is) the implementer, which is every run this plugin currently supports. The auto-mode
  classifier will block this exact sequence every time, not just this once, unless a human or
  a genuinely independent agent performs the final write. This is a structural gap between
  the skill's documented flow and the runtime's guardrails, not a one-off denial.

## Worth changing before the next run

1. **Add a spawn-threshold heuristic to the README** ("Orchestrating economically" section):
   a plan this specific and this small (line-level steps, ≤2 files) should be a direct edit,
   not an `implementer` spawn — this run's subagent cost ($2.20, 53 turns) would very likely
   drop to near zero as orchestrator-side `Edit` calls.
2. **Resolve the `pr-self-review` self-write conflict.** Either route the final verdict-file
   write through an explicit human confirmation step in the skill itself (so it's an
   authorized action, not a bare `Bash` write the classifier has to guess about), or document
   that under auto-mode this skill's last step always needs the user to execute it.
3. No change needed to file-ownership or parallelism handling — this run had none of the
   failure modes those rules guard against (single agent, no collisions, no cold-respawn fix
   loop).
