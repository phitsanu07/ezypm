---
description: End-to-end fullstack feature delivery — orchestrates architect → parallel backend/frontend → integration → testing → review
argument-hint: <feature-name or feature description>
allowed-tools: Agent, Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Fullstack Feature Delivery Pipeline

You are orchestrating an end-to-end feature delivery for: **$ARGUMENTS**

Drive the 6-phase pipeline below. Use `TodoWrite` to track each phase as a task and mark phases complete as they finish. Each Agent spawn must include enough self-contained context (the feature description, the spec path, and what came before) — agents do NOT share your conversation memory.

---

## Phase 1 — DESIGN (sequential, blocking)

Spawn `architect` to produce a spec document at `docs/specs/<feature-name>.md`.

**Prompt the agent with:**
- The feature request: $ARGUMENTS
- Instruct it to analyze existing codebase patterns first
- Required spec sections: API endpoints, request/response schemas, DB changes, UI components/pages, dependencies, edge cases, test scenarios
- Output path: `docs/specs/<feature-name>.md` (derive `<feature-name>` from $ARGUMENTS as kebab-case)

**Before continuing:** verify the spec file exists with `Read`. If absent or incomplete, re-spawn architect with corrections. Do NOT skip ahead.

---

## Phase 2 — PARALLEL IMPLEMENTATION (concurrent)

Spawn `backend-api` and `frontend-builder` **in a single message with two Agent tool uses** so they run in parallel.

**Both agents receive:**
- The spec path from Phase 1 — they must `Read` it first
- Strict scope reminder: backend-api owns `src/api/**`, frontend-builder owns `src/frontend/**`
- Instruction to NOT modify shared types in `src/types/` — only consume

**While they run:** do not start Phase 3. Wait for both to complete.

If either reports a blocker that requires spec changes, loop back to Phase 1.

---

## Phase 3 — INTEGRATION (sequential, blocking)

Spawn `implementer` to wire frontend ↔ backend.

**Prompt the agent with:**
- Spec path from Phase 1
- Summary of what backend-api and frontend-builder delivered
- Tasks: shared types in `src/types/`, env/config updates, API client wiring, integration test harness setup
- Run `npm run type-check` (or project equivalent) before reporting done

---

## Phase 4 — TESTING (concurrent)

Spawn `tester` and `qa-tester` **in parallel** (single message, two Agent calls).

- `tester` → unit + integration + API + component tests. Must run the suite and report coverage. Target 80%+.
- `qa-tester` → manual/UI flows, edge cases, user scenarios.

If either reports failing tests caused by implementation bugs, spawn the relevant builder agent (`backend-api` or `frontend-builder`) to fix, then re-run the failed agent.

---

## Phase 5 — CODE REVIEW (sequential, gating)

Spawn `reviewer` with:
- Spec path
- Summary of all changes (run `git status` and `git diff main...HEAD --stat` first and include the output)
- Required checks: spec compliance, security, code quality, test coverage

**Verdict handling:**
- `APPROVE` → proceed to Phase 6
- `REQUEST CHANGES` → route each issue to the right agent (backend-api / frontend-builder / tester), apply fixes, then re-spawn `reviewer`. Loop until approved.

---

## Phase 6 — MERGE & DEPLOY

Only after reviewer approves:
1. Show the user a final summary: files changed, test results, reviewer verdict
2. Show proposed commit message + branch strategy
3. **STOP and ask the user** before running `git commit`, `git push`, or any deploy command — these are shared-state actions requiring explicit confirmation per project safety rules

---

## Orchestration rules

- **Always parallelize Phase 2 and Phase 4** — one message with multiple Agent calls.
- **Never skip a phase**, even if the feature seems small. If a phase is truly N/A (e.g., no UI changes), state that explicitly and skip with a one-line justification.
- **Each agent prompt must be self-contained** — include feature description, spec path, prior phase outputs. Agents have no view of this conversation.
- **Verify, don't trust** — after each agent completes, `Read` the files it claims to have created/modified before advancing.
- **Surface blockers immediately** — if any phase fails twice on the same issue, stop and ask the user for direction rather than looping further.
- **Track with TodoWrite** — create todos for the 6 phases at the start; mark each `completed` only after verification.

Begin Phase 1 now.
