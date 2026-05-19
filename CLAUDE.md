# GridWork (ezypm) — Project Memory for Claude

Project Management web app with an Excel-like grid (1 row = 1 sub-project). Frontend ports static HTML/CSS prototypes from `project-management/project/` into a real React app.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Zustand + plain CSS |
| Backend | Express + TypeScript + `@supabase/supabase-js` (service role) + `@google/generative-ai` (Gemini) |
| Validation | Zod |
| DB / Auth | Supabase (Postgres + RLS + Auth) |
| Tests | Vitest (unit/integration) + Playwright (E2E) |
| Tooling | ESLint + Prettier, `tsx watch` for API dev |

**Not used:** Next.js, Redux, React Query, Tailwind, ORM (Prisma/Drizzle), Jest. Don't introduce them.

## Directory layout & ownership

```
src/
  types/      — Shared TS contracts. READ-ONLY for backend-api and frontend-builder.
                Only `architect` + `implementer` may modify.
  frontend/   — React UI. Owned by `frontend-builder`.
  api/        — Express server. Owned by `backend-api`.
supabase/
  migrations/ — SQL DDL files. Owned by `backend-api`. USER runs manually (see below).
  seed.sql    — Seed data. USER runs manually.
tests/        — Integration + E2E. Owned by `qa-tester`.
docs/specs/   — Feature specs from `architect`. Source of truth for implementation.
project-management/project/ — Static HTML/CSS design source. READ-ONLY reference.
src/frontend/_design-reference/ — Mirror of the design files, excluded from TS build.
```

**Hard rules:**
- `backend-api` MUST NOT touch `src/frontend/**`. `frontend-builder` MUST NOT touch `src/api/**`.
- Neither builder modifies `src/types/**` — they only import from it.
- Never run migrations programmatically. Output SQL files only; user applies them.

## Path aliases (tsconfig)

```ts
"@/types"       → "src/types/index"
"@/types/*"     → "src/types/*"
"@/frontend/*"  → "src/frontend/*"
"@/api/*"       → "src/api/*"
```

Always use these aliases instead of long relative paths.

## API contract — response envelope

Every API endpoint returns one of these shapes (defined in `src/types/api.ts`):

```ts
// Success
{ ok: true, data: T }

// Error
{ ok: false, error: { code: string, message: string, details?: unknown } }
```

Status codes: 200/201/204 success · 400 validation · 401 unauth · 403 forbidden · 404 not found · 409 conflict · 422 semantic · 500 server. Always send the envelope, even on errors.

## Database workflow (manual, no auto-migrate)

Agents NEVER connect to Postgres directly. Produce:
- `supabase/migrations/<timestamp>__<name>.sql` — DDL with tables, RLS policies, indexes
- `supabase/seed.sql` — initial data

Then tell the user to run them via Supabase Dashboard SQL Editor or `supabase db push`. Do not attempt to run them.

RLS is mandatory on every table. Never write code that relies on bypassing RLS from the frontend.

## State management (frontend)

- Use **Zustand** for client state. Stores live in `src/frontend/store/`.
- No React Query / SWR / Redux. Plain `fetch` + Zustand + `useEffect` is the pattern.
- Loading / empty / error states must be explicit in every page that fetches data.

## Commands

```bash
npm install
npm run dev              # concurrent: API :3001 + Vite :5173
npm run dev:api          # API only
npm run dev:fe           # Frontend only
npm run typecheck        # tsc --noEmit (both api + fe via tsconfig.json)
npm run lint             # eslint, --max-warnings=0 (zero tolerance)
npm run test             # vitest run (unit + integration)
npm run test:watch       # vitest watch
npm run test:integration # tests/integration only
npm run test:e2e         # playwright
npm run test:e2e:ui      # playwright UI mode
npm run build            # build:api then build:fe
```

**After ANY code change**, run `npm run typecheck && npm run lint` before reporting done. Fix until both are clean.

## Coding conventions

- TypeScript strict mode is on (including `noUncheckedIndexedAccess`). No `any`. No `as` casts unless unavoidable — prefer type guards.
- Async/await everywhere. No `.then()` chains.
- camelCase for variables/functions, PascalCase for types/components, kebab-case for filenames where the rest of the codebase uses it.
- Domain types use ISO date strings (`ISODateString`, `ISODateOnly` in `src/types/domain.ts`), not `Date` objects across the API boundary.
- Validate ALL request inputs with Zod at the route boundary. Never trust `req.body` directly.

## Environment

- `.env` is gitignored but `.env.example` lives at root with shape: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus Gemini key.
- Backend uses the service role key (server-only). Frontend uses anon key (RLS-enforced).
- Never log or commit secrets.

## Agent workflow

Use `/fullstack_dev <feature>` to run the full 6-phase pipeline:
1. `architect` → produces `docs/specs/<feature>.md` (backend + frontend + shared types + flows)
2. `backend-api` + `frontend-builder` in parallel — implement from spec
3. `implementer` — wires shared types, config, integration harness
4. `tester` + `qa-tester` in parallel — unit/integration/E2E
5. `reviewer` — gates approval
6. User confirms before commit/push

When invoking agents directly, always pass: feature description + spec path + prior phase outputs. Agents have no shared memory with the main session.

## What NOT to do

- Don't run `supabase db push` or any DB-modifying command on the user's behalf.
- Don't `git commit` / `git push` without explicit user approval.
- Don't add backwards-compat shims for code that isn't in production yet (this is greenfield).
- Don't introduce new state libs, ORM layers, CSS frameworks, or test runners — the stack is fixed.
- Don't modify files under `project-management/project/` or `src/frontend/_design-reference/` — they're the design source of truth.
