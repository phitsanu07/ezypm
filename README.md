# GridWork — ezypm

**Project Management ที่ใช้เหมือน Excel** — a portfolio grid where 1 row = 1 sub-project, with Excel-like keyboard nav, cell-level editing, and multi-board support.

> **Design source of truth:** [`project-management/project/`](./project-management/project/) — exported HTML/CSS/JS prototype from claude.ai/design. The frontend ports `GridWork.html`, `login.html`, and `admin.html` to a real React + TypeScript app. `src/frontend/_design-reference/` mirrors these files so agents can reference them in-place.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Zustand + plain CSS (ported from design) |
| Backend (thin) | Express + TypeScript + `@supabase/supabase-js` (service role) + `@google/generative-ai` |
| DB / Auth | Supabase (Postgres + RLS + Auth) |
| Tests | Vitest (unit/integration) + Playwright (E2E) |

## Module ownership

```
src/
  types/         — shared TS contracts (Lead-owned, others read-only)
  frontend/      — React UI (owned by frontend-builder)
  api/           — Express server (owned by backend-api)
supabase/
  migrations/    — SQL migration scripts, USER runs them manually (owned by backend-api)
  seed.sql       — seed data scripts, USER runs (owned by backend-api)
tests/           — integration + E2E (owned by qa-tester)
```

## Database workflow (manual)

Agents **never** connect to Supabase Postgres directly. They produce:
- `supabase/migrations/<timestamp>__<name>.sql` — DDL (tables, RLS policies, indexes)
- `supabase/seed.sql` — initial data

**You run them yourself** via either:

- **Supabase Dashboard** → SQL Editor → paste & run each file in order
- **`supabase` CLI** → `supabase db push` (if you have the project linked)

## Run dev

```bash
npm install
npm run dev     # API on :3001, Vite on :5173
```

## Env

Copy `.env.example` → `.env` and fill in your Supabase keys + Gemini API key. The committed `.env` already has the values from the example for local dev.
