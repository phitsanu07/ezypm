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

- `.env` is gitignored but `.env.example` lives at root with shape:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend — Vite reads `VITE_*` only)
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (backend — server-only)
- Backend uses the service role key (server-only). Frontend uses anon key (RLS-enforced).
- Never log or commit secrets.
- `dev:api` script sets `NODE_TLS_REJECT_UNAUTHORIZED=0` for corporate-proxy environments (boonthavorn). Dev-only — do not enable in production.

## Authentication & Vercel deploy — pitfalls (debugged the hard way)

These tripped us up during the initial Vercel deploy. Read before touching auth, env, or build config.

### 1. Vite `import.meta.env.PROD` depends on `NODE_ENV` at build time

`vite build` alone is **not enough** — if the shell has `NODE_ENV` unset or empty, `import.meta.env.PROD === false`, so the dev branch of any ternary stays in the production bundle. The frontend ended up calling `http://localhost:3001/api/auth/me` from `https://ezypm.vercel.app` → CORS-blocked → "Failed to load profile".

Always:
- `build:fe` script is `NODE_ENV=production vite build` (not just `vite build`)
- Use `import.meta.env.PROD ? "" : "http://localhost:3001"` with **dot notation** in `apiClient.ts`. Vite tree-shakes the dead branch; bracket notation (`import.meta.env["VAR"]`) does **not** tree-shake reliably
- Frontend on Vercel uses **relative `/api/*`** paths (same origin) — no `VITE_API_BASE_URL` env var needed in production

### 2. Vercel serverless functions: ESM vs CJS depends on nearest `package.json`

Vercel's `@vercel/node` builder looks at the **nearest `package.json`** to the function file to decide CJS vs ESM. The root `package.json` has no `"type"` field → defaults to CJS. So `api/index.ts` (which uses `import.meta.url` + `createRequire`) MUST live next to an `api/package.json` with `{"type": "module"}`. Without it: `SyntaxError: Cannot use import statement outside a module` → `FUNCTION_INVOCATION_FAILED`. See pitfall #5 for the full symptom.

Other facts about the function runtime:
- `require()` is undefined in ESM context — use `createRequire(import.meta.url)` if you must do CJS interop
- `process.exit(N)` at module-load time silently kills the worker → `FUNCTION_INVOCATION_FAILED` with no log
- Static `import "../src/..."` from `api/*.ts` is **NOT bundled** by `@vercel/node` — the dep tree above `/api/` is left as runtime imports → `ERR_MODULE_NOT_FOUND` at runtime
- TypeScript path aliases (`@/api/*`) are **not rewritten** during compile — they reach runtime as literal `require("@/api/env")` and fail to resolve

### 3. The Vercel build pipeline we landed on

`api/index.ts` (the Vercel function entry) is intentionally minimal:

1. `npm run build:api` runs `tsc -p tsconfig.api.json && tsc-alias -p tsconfig.api.json`
   - tsc compiles `src/api/**` → `compiled/api/**` as CJS
   - tsc-alias rewrites `@/api/...` → relative `./...` in the compiled output
2. `vercel.json` has `functions["api/index.ts"].includeFiles: "compiled/**"` so the compiled tree ships with the function bundle
3. `api/index.ts` uses `createRequire(import.meta.url)` + lazy load to require `../compiled/api/api/server.js` inside an ESM handler — wrapped in try/catch so init errors surface as JSON instead of opaque 500s
4. `api/package.json` declares `{"type": "module"}` — without this Vercel loads `api/index.js` as CJS and the ESM `import` syntax throws (see pitfall #5)
5. `compiled/` is gitignored (regenerated each deploy)

Do NOT:
- Put the Express setup directly in `api/index.ts` — it must stay tiny
- Try to import `../src/api/server` from `api/*.ts` — it won't bundle
- Use `process.exit()` anywhere reachable from module load — `src/api/env.ts` validates lazily via a `Proxy` for this reason
- Put backend output in `dist/` — that's the Vite outputDirectory (static assets). Use `compiled/`
- Delete `api/package.json` or remove its `"type": "module"` field — breaks the function in production (see pitfall #5)
- Add `"type": "module"` to the ROOT `package.json` — it'll break `tsx watch`, the dev API, and parts of the build chain. Keep the ESM scope confined to `api/`

### 4. Authentication flow (single source of truth)

```
Login form (LoginPage)
  → supabase.auth.signInWithPassword(email, password)   [Supabase JS — direct]
  → frontend gets a JWT
  → useAuthStore.bootstrap()
  → apiClient.get("/api/auth/me")                       [Express, JWT in Bearer]
  → Express requireAuth middleware:
     - supabaseAdmin.auth.getUser(token)  → user id
     - SELECT profile by id               → req.profile
     - reject 403 USER_SUSPENDED if status='suspended'
  → /api/auth/me returns { profile, boards[] }
```

If `/api/auth/me` ever returns a non-401 error, the frontend shows "Failed to load profile". The error is **never** about Supabase Auth itself — it's always one of:
- Network/CORS (build pointed at wrong origin — see #1)
- Backend crash on module load (env/process.exit — see #2)
- Vercel function won't load at all (CJS/ESM mismatch — see #5)
- Profile row missing for the auth.users id (run seed.sql, or there's an orphan)
- Profile suspended (status='suspended' → admin can reactivate)

Quick triage:
- `curl https://ezypm.vercel.app/api/health` returns 500 with `x-vercel-error: FUNCTION_INVOCATION_FAILED` → function itself is broken (#2 or #5), not auth
- 401 → expected behavior when no/expired token; frontend should redirect to login
- 403 → profile suspended or RLS denied
- 500 with our envelope shape `{ ok: false, error: { code: "..." } }` → reaches handler but blows up downstream

### 5. Vercel runtime needs `api/package.json` with `"type": "module"`

**Symptom:** every `/api/*` returns `FUNCTION_INVOCATION_FAILED`; Vercel runtime logs show:
```
SyntaxError: Cannot use import statement outside a module
    at /var/task/api/index.js:4
    import { createRequire } from "module";
```

**Root cause:** Vercel's `@vercel/node` builder respects the nearest `package.json`'s `"type"` field. The root `package.json` has no `"type"` (defaults to CJS for the rest of the toolchain — `tsx watch`, vite dev, build scripts). So when Vercel compiles `api/index.ts` → `api/index.js`, it runs the output as CJS by default, but the source uses ESM-only constructs (`import.meta.url`, `createRequire`, `export default`). Node's CJS loader hits the first `import` and throws — function never reaches the handler, no JSON envelope, no Express logs, opaque `FUNCTION_INVOCATION_FAILED`.

**Fix:** A `api/package.json` containing just `{"type": "module"}` confines the ESM scope to the function directory. Vercel sees this nearer to `api/index.js` and loads it as ESM. Root toolchain keeps running as CJS.

Do NOT "fix" this by:
- Adding `"type": "module"` to root `package.json` — breaks dev API and tsx watch
- Renaming to `api/index.mts` — Vercel doesn't reliably detect `.mts` as a function entry
- Rewriting `api/index.ts` as CJS (`module.exports =`) — works but loses the typed `export default handler` and the `import.meta.url` pattern needed by `createRequire`

This is a single-line config that's easy to lose during refactors. Always verify after touching `api/`, `vercel.json`, or `package.json`:
```bash
test -f api/package.json && grep -q '"type": "module"' api/package.json && echo OK || echo BROKEN
```

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
