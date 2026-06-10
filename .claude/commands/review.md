---
description: Parallel multi-reviewer audit of project code against main — security + performance + tests, then gate APPROVE / REQUEST CHANGES
argument-hint: [optional scope hint, e.g. "src/api" or "PR #42"]
allowed-tools: Agent, Read, Bash, Grep, Glob, TodoWrite
---

# Multi-Reviewer Code Audit

You are orchestrating a parallel code review of the current branch against `main`. Scope hint (optional): **$ARGUMENTS**

The goal: run three specialist reviewers concurrently, wait for every one to finish, then issue a single verdict.

---

## Phase 1 — DIFF SNAPSHOT (sequential, blocking)

Before spawning any reviewer, capture the change set so each agent gets the same self-contained context. Run in parallel:

- `git status`
- `git rev-parse --abbrev-ref HEAD`
- `git diff main...HEAD --stat`
- `git log main..HEAD --oneline`

If the current branch is `main` itself (no diff), tell the reviewers to audit the latest scaffold commits (or the scope hint in $ARGUMENTS) and continue.

Record the diff summary — every reviewer prompt below MUST include it verbatim.

---

## Phase 2 — PARALLEL REVIEW (concurrent, blocking)

Spawn **all three reviewers in a single message** with three `Agent` tool uses so they run in parallel. Do NOT spawn them sequentially.

Each prompt MUST be self-contained: include the project root path, stack summary, diff snapshot from Phase 1, the scope hint from $ARGUMENTS, and the agent's focus areas. Agents have no view of this conversation.

### Agent 1 — `security-reviewer`
Focus:
- Auth / authz (RLS policies, middleware, session handling)
- Input validation at every boundary
- Secret leakage (`.env*`, seed files, hardcoded keys/passwords)
- SQL injection, XSS, CSRF, CORS misconfig
- Error responses leaking internal details
- Third-party API key handling

### Agent 2 — `performance-reviewer`
Focus:
- N+1 query patterns
- Missing DB indexes / expensive RLS predicates
- React render storms (over-broad store subscriptions, missing memoization)
- Bundle size, code-splitting opportunities
- Synchronous I/O on hot paths
- Network chattiness (could be batched / paginated / cached)

### Agent 3 — `test-reviewer`
Focus:
- Coverage gaps on routes, stores, critical components
- Weak assertions (status-only, snapshot-only)
- Missing happy/error/edge paths
- Test isolation, flakiness, hardcoded data collisions
- Skipped tests (`.skip`, `xit`, `todo`) without justification
- API response envelope shape assertions

**Required report format for every reviewer:**
- `CRITICAL` (blocking)
- `HIGH`
- `MEDIUM` / `LOW` (informational)
- `file_path:line_number` reference for every finding

Reviewers are read-only. Instruct them explicitly: do NOT modify code, do NOT run destructive commands.

---

## Phase 3 — WAIT FOR ALL REVIEWERS

Do not proceed to verdict until all three agents have returned. If one agent fails or times out, re-spawn only that agent with the same prompt. Do not summarize partial results.

---

## Phase 4 — VERDICT (gating)

Aggregate findings across all three reviewers:

- **APPROVE** — only if zero `CRITICAL` findings across all reviewers.
- **REQUEST CHANGES** — if any reviewer reports ≥1 `CRITICAL` finding.

Present the verdict at the top, then a per-reviewer breakdown with counts (`CRITICAL / HIGH / MEDIUM / LOW`) and the top blocking items as clickable `file_path:line_number` references.

If the verdict is `REQUEST CHANGES`, also list a prioritized fix order (highest-leverage critical items first). Do NOT attempt the fixes — that's outside this command's scope.

---

## Orchestration rules

- **Phase 2 must be parallel** — one message, three `Agent` tool calls. Never sequential.
- **Every reviewer prompt is self-contained** — include the diff snapshot, project paths, focus areas. No shared memory.
- **Wait for all three** before issuing the verdict.
- **Read-only** — reviewers must not modify code; the orchestrator must not commit, push, or fix anything.
- **Track with TodoWrite** — one todo per phase; mark complete only after verification.
- **Surface blockers** — if any reviewer fails twice, stop and ask the user.

Begin Phase 1 now.
