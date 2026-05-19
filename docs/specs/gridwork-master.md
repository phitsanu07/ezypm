# GridWork (ezypm) — Master Spec

Status: Phase 1 (DESIGN) output. Source of truth for Phase 2 implementation. Read this file first, then the supplement that matches your role.

Supplements (relative paths):

- Backend builder: [`./gridwork-backend.md`](./gridwork-backend.md)
- Frontend builder: [`./gridwork-frontend.md`](./gridwork-frontend.md)
- Phase 3 implementer (shared types): [`./gridwork-types-delta.md`](./gridwork-types-delta.md)

---

## 1. Overview

GridWork (product code `ezypm`) is a desktop-first web app for portfolio-level Project Management. The defining UI is an Excel-like grid where **one row = one sub-project** and columns are typed cells (name, lead, team, status, priority, due, progress, quarter, tags). Each board groups multiple projects, and each project groups multiple sub-projects.

The MVP is a single-organisation app with three global roles (admin / editor / viewer) and per-board membership. Users log in with email + password (Supabase Auth). After login they land on a portfolio view of their default board and can edit cells inline with optimistic updates. Admins manage users and boards from a separate `/admin` route.

**In scope for MVP:**

- Email + password login (Supabase Auth, admin sets initial password).
- Multi-board (each user is a member of zero or more boards).
- Portfolio view (grid), Calendar view (activities), Reports view (week strips). All three rendered for the active board.
- Inline cell editing of all 9 column types with optimistic UI + rollback on error.
- Drag-reorder of sub-project rows within and across projects in the same board.
- Activities (meeting / milestone / progress / note / block) attached to a sub-project, listed on the Calendar.
- Admin panel: user CRUD (soft-delete via suspend) and board CRUD with delta-style member add/remove.
- Three-tier auth: global role (`admin | editor | viewer`) + per-board membership + activity-author check for activity mutations.
- Manual `↻ Refresh` plus refetch-on-window-focus to recover from staleness.

**Out of scope for MVP** (see section 16 for full list):

- AI / Gemini integration (deferred entirely — no endpoints, no env var, no UI).
- Realtime presence and live grid updates (RLS is realtime-ready for v2 flip-on).
- Hard-delete of users (suspend only).
- Comments, attachments, mentions, notifications.
- Mobile / tablet responsive layout (design assumes desktop ≥ 1280 px).
- CSV import/export, bulk operations, SSO, theme switcher, self-service password reset UI.

**Primary user stories:**

- As an **admin**, I can create a board, add editors, and assign projects so my team has a workspace ready when they log in.
- As an **editor**, I can open a board, click a status cell, pick "UAT", and the grid + progress bar update immediately without page reload.
- As a **viewer**, I can browse the same grid read-only and see the same data my editors see.
- As any user, I can switch boards from the appbar's board switcher and the new board's portfolio replaces the grid.

---

## 2. Personas & top user flows

| Persona | Global role | Permissions |
|---|---|---|
| **Org admin** | `admin` | Manage users (create, suspend, role, color). Manage all boards (create, rename, delete, members). Read + write everything on every board (auto-membership not implied — admin still must be a board member to see it, BUT the admin route bypasses board membership). Edit/delete any activity. |
| **Project editor** | `editor` | Read + write on boards they belong to. Create / edit / delete projects, sub-projects, and own activities. Cannot enter the admin route. Cannot edit activities authored by others. |
| **Stakeholder viewer** | `viewer` | Read-only on boards they belong to. UI hides edit controls. Backend rejects mutations with `FORBIDDEN`. |

### Top flows (happy path)

1. **Login → portfolio → edit a cell.** User loads `/login`, types email + password, hits Sign In. Supabase Auth returns an access_token. Auth bootstrap calls `GET /api/auth/me`; if it returns at least one board the app routes to `/` (defaulting to the last-active board from localStorage, else the first board). User clicks a status cell on row 4, picks "UAT" in the popover. Frontend optimistically swaps the chip and sends `PUT /api/sub-projects/:id`. On 200 the server response replaces the optimistic state; on error the cell rolls back and a toast appears.
2. **Admin creates board with members.** Admin navigates to `/admin?tab=boards`, clicks "+ New Board", fills the modal (name, color, icon, initial members). Submit calls `POST /api/admin/boards`. The new board appears in the table and is now visible to the chosen editors at their next `GET /api/auth/me`.
3. **Switching boards persists across reload.** From the appbar BoardSwitcher, user picks a different board. The portfolio store refetches the new board's `GET /api/boards/:id/portfolio`. The active board id is persisted to `localStorage` under `gridwork.activeBoardId.v1`. On reload, the same board reopens.
4. **Suspended user is locked out.** Admin opens user row, sets status to `suspended`. The user, already logged in, tries any action: backend `requireAuth` rejects with `403 USER_SUSPENDED`. Frontend catches the code, clears auth state, routes to `/login`, shows toast "บัญชีของคุณถูกระงับ".

---

## 3. Architecture map

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Browser (React 18 + Vite + Zustand, single SPA, hash router)             │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐   ┌──────────────────────┐   │
│  │ Supabase JS     │    │ apiClient.ts    │   │ Zustand stores       │   │
│  │ (anon key)      │    │ fetch wrapper:  │   │  • auth              │   │
│  │ • signInWith…   │    │  Authorization: │   │  • boards            │   │
│  │ • getSession    │    │  Bearer <jwt>   │   │  • portfolio         │   │
│  │ (Auth ONLY,     │    │  envelope unwrap│   │  • activities        │   │
│  │  no realtime    │    └────────┬────────┘   │  • gridUI            │   │
│  │  in MVP)        │             │            │  • toast             │   │
│  └────────┬────────┘             │            └──────────────────────┘   │
└───────────┼──────────────────────┼──────────────────────────────────────┘
            │ (1) login            │ (2) every API call w/ JWT
            ▼                      ▼
┌───────────────────────┐  ┌──────────────────────────────────────────────┐
│ Supabase Auth         │  │ Express :3001 (TypeScript, tsx watch)        │
│ • email + password    │  │  cors → helmet → morgan → express.json       │
│ • returns access_token│  │   → requireAuth (verifies JWT via Supabase)  │
└───────────────────────┘  │   → requireBoardMember / requireBoardAdmin / │
                           │     requireGlobalAdmin / requireActivity…    │
                           │   → Zod parse → handler                      │
                           │   → errorHandler (envelope)                  │
                           │                                              │
                           │ Supabase client (service role, server-only)  │
                           │  • bypasses RLS                              │
                           │  • API enforces membership/role checks       │
                           └────────────────────┬─────────────────────────┘
                                                │
                                                ▼
                           ┌──────────────────────────────────────────────┐
                           │ Supabase Postgres                            │
                           │  Tables: profiles, boards, board_members,    │
                           │   projects, sub_projects,                    │
                           │   sub_project_members, activities            │
                           │  RLS enabled on every table (realtime-ready) │
                           └──────────────────────────────────────────────┘
```

**JWT flow.** Browser calls `supabase.auth.signInWithPassword()` (anon key, public). On success the JS SDK stores the session in its default storage (`localStorage`). Our `apiClient.ts` reads `supabase.auth.getSession().data.session?.access_token` before each call and sets `Authorization: Bearer <jwt>`. Express verifies via `supabase.auth.getUser(token)` (server-only call to Supabase Auth). The verified `user.id` is loaded into `profiles` to attach `req.profile`. Service role is used for all DB queries because Express enforces membership in middleware — RLS is the second line of defense (and the realtime-readiness for v2).

**No Gemini.** AI integration is deferred to v2. The `@google/generative-ai` package stays installed but the server never imports it and `GEMINI_API_KEY` is NOT required at boot.

---

## 4. Data model

Seven tables. Full column lists, constraints, and RLS policy intent live in [`./gridwork-backend.md`](./gridwork-backend.md#data-model). The summary below is for orientation:

| Table | Purpose | Key FKs |
|---|---|---|
| `profiles` | One row per app user, mirrors `auth.users.id`. Holds name/email/role/status/color. `status` includes `suspended` for soft-delete. | `id` → `auth.users.id` |
| `boards` | A workspace. Owned by one profile; visible to its members. | `owner_id` → `profiles.id` |
| `board_members` | Junction. Per-board membership. | `(board_id, user_id)` |
| `projects` | Group of sub-projects inside a board. Ordered by `position` per board. | `board_id` → `boards.id` |
| `sub_projects` | The ROW in the grid. Ordered by `position` per project. Holds all 9 cell values. | `project_id` → `projects.id`, `lead_id` → `profiles.id` |
| `sub_project_members` | Junction for the "Team" column. | `(sub_project_id, user_id)` |
| `activities` | Calendar items linked to a sub-project. Author tracked for permission checks. | `sub_project_id`, `author_id` |

**Position ordering.** Both `projects.position` and `sub_projects.position` are integers using a **gap-100** strategy. New rows append at `max(position) + 100`. Drag-reorder writes `(previous + next) / 2`. If a write would put the gap below 2 within a contiguous run of the same project, the backend renumbers only that segment back to 100, 200, 300, … inside a transaction. The whole-board renumber is intentionally avoided.

**At-risk derivation.** Computed in the API layer (not in DB) and on the frontend (for footer counts on optimistic UI). A sub-project is at risk if either:

- `due < today (UTC date)` AND `status !== 'go_live'`, **OR**
- `updated_at < (today − AT_RISK_STALE_DAYS days)` AND `status !== 'go_live'`.

`AT_RISK_STALE_DAYS = 14`, defined in `src/types/domain.ts` (see [types delta](./gridwork-types-delta.md)).

**Auto-progress.** When `status` changes via API, server writes the canonical progress from `STATUS_PROGRESS` (already in `src/types/enums.ts`). When `progress` changes via API, server derives the implied status with `deriveStatusFromProgress`. Both directions are server-authoritative — frontend may pre-fill the optimistic patch with the same values but the response is canonical.

**RLS intent (overview).** Every table has RLS enabled. Service role bypasses (Express path). Anon key path is strict:

- `profiles`: a user can `SELECT` their own row + any profile that shares a board with them (via `board_members` co-membership).
- `boards`, `projects`, `sub_projects`, `sub_project_members`, `activities`: a user can `SELECT` rows whose `board_id` (directly or transitively) appears in their `board_members`. `INSERT/UPDATE/DELETE` rejected via RLS on the anon path — the API mediates writes.
- `board_members`: `SELECT` allowed for self and co-members; mutations service-role only.

Detailed policy SQL outlines are in [`gridwork-backend.md` § Data model](./gridwork-backend.md#data-model).

---

## 5. Database migrations

backend-api will write the SQL files in Phase 2. This spec defines what each file must contain — no SQL is written here.

| File | Purpose | Content summary |
|---|---|---|
| `supabase/migrations/0001__init_schema.sql` | DDL + indexes + RLS + triggers | All 7 tables, FK constraints, unique indexes, composite indexes, `enable row level security` per table, all `create policy` statements (one per role + per verb), the `update_updated_at()` trigger function applied to every table with `updated_at`. |
| `supabase/migrations/0002__seed_helpers.sql` | Helper views (optional) | Optional view `v_board_portfolio` if it simplifies the portfolio query. Backend may instead build the payload in TypeScript — implementer decides during Phase 2. |
| `supabase/seed.sql` | Seed data for dev | One admin profile mapped to a known auth.users id, 6–8 example editor/viewer profiles, 2 boards (one as 1278: "Main", second: "Side"), 3 projects per board, 4–6 sub-projects per project across all status values, sample tags, sample activities for the next 4 weeks. Mirror the shape of `project-management/project/src/data.js`. |

User applies these manually via the Supabase Dashboard SQL Editor or `supabase db push`. Agents NEVER execute them.

Full per-table column / index / policy outline: see [`gridwork-backend.md` § Data model](./gridwork-backend.md#data-model).

---

## 6. API surface

Grouped routes, full detail in [`gridwork-backend.md` § Route table](./gridwork-backend.md#route-table). The summary:

| Group | Routes |
|---|---|
| Auth + bootstrap | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Boards | `GET /api/boards`, `GET /api/boards/:id`, `GET /api/boards/:id/portfolio`, `POST /api/boards/:id/members`, `DELETE /api/boards/:id/members/:userId` |
| Projects | `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id` |
| Sub-projects | `POST /api/sub-projects`, `PUT /api/sub-projects/:id`, `PUT /api/sub-projects/:id/reorder`, `DELETE /api/sub-projects/:id`, `POST /api/sub-projects/:id/members`, `DELETE /api/sub-projects/:id/members/:userId` |
| Activities | `GET /api/sub-projects/:id/activities`, `POST /api/activities`, `PUT /api/activities/:id`, `DELETE /api/activities/:id` |
| Admin | `GET /api/admin/users`, `POST /api/admin/users` (invite), `PUT /api/admin/users/:id`, `POST /api/admin/boards`, `PUT /api/admin/boards/:id`, `DELETE /api/admin/boards/:id` |

No `/api/ai/*` routes. AI is out of scope for MVP (section 16). Both `SummarizeBoardInput` and `SuggestNextStepInput` types remain in `src/types/api.ts` so v2 can wire them without a type-shape change.

Every response uses the envelope `{ ok: true, data }` / `{ ok: false, error: { code, message, details? } }` (already defined in `src/types/api.ts`). Status codes follow `CLAUDE.md` (200/201/204 success · 400 validation · 401 unauth · 403 forbidden · 404 not found · 409 conflict · 422 semantic · 500 server).

---

## 7. Frontend pages & routes

Single Vite SPA. Hash router (no React Router dependency — we own a tiny router under `src/frontend/app/Router.tsx`). Full page-level state mapping is in [`gridwork-frontend.md` § Pages](./gridwork-frontend.md#pages).

| Hash route | Page component | Auth | Notes |
|---|---|---|---|
| `#/login` | `LoginPage` | none | Public. Dev-only demo-creds box. |
| `#/` | `PortfolioPage` (default active board) | required | Redirects to `#/no-access` if user has zero boards. |
| `#/board/:id` | `PortfolioPage` (specific board) | required + board member | Switches active board; persists id to localStorage. |
| `#/admin?tab=users` | `AdminPage` (Users tab) | required + global admin | Non-admins routed to `#/`. |
| `#/admin?tab=boards` | `AdminPage` (Boards tab) | required + global admin | Same guard. |
| `#/no-access` | `NoBoardAccessPage` | required | Shown when user has zero board memberships. |

Every page handles `loading` / `error` / `empty` explicitly (loader, error state with retry, empty-state CTA).

---

## 8. Frontend components

Top-level tree (full responsibilities, props, and parent-child relationships in [`gridwork-frontend.md` § Component tree](./gridwork-frontend.md#component-tree)):

```
src/frontend/
  app/
    App.tsx                     ← <Router /> + global providers
    Router.tsx                  ← hash router, guard wiring
    Providers.tsx               ← Toast portal, focus-refetch listener
  pages/
    LoginPage.tsx
    PortfolioPage.tsx           ← portfolio | calendar | reports view-switch
    AdminPage.tsx               ← users | boards tab-switch
    NoBoardAccessPage.tsx
  components/
    layout/                     ← AppBar, BoardSwitcher, UserMenu, Toolbar, SheetFooter, ViewSwitcher
    grid/                       ← Grid, GridHeader, ProjectGroupRow, SubProjectRow, RowNumberCell, AddRow, useGridKeyboardNav, useGridDragDrop
    cells/                      ← NameCell, AssigneeCell, TeamCell, StatusCell, PriorityCell, DateCell, ProgressCell, TagsCell, TextCell, Popover
    calendar/                   ← CalendarView, ActivityModal
    reports/                    ← ReportsView, WeekStrip, WeekCard
    admin/                      ← UsersPanel, BoardsPanel, UserEditModal, BoardEditModal, MemberPicker, ConfirmDialog
    ui/                         ← Avatar, Chip, Modal, Spinner, Toast, EmptyState, ErrorState, IconButton
  store/                        ← Zustand stores (one per concern)
  lib/                          ← apiClient.ts, supabaseClient.ts, http-errors.ts, dates.ts, atRisk.ts
  styles/                       ← tokens.css (verbatim :root), app.css, grid.css, cells.css, calendar.css, reports.css, admin.css, login.css, modal.css
```

`Avatar`, `Chip`, `Modal`, `EmptyState`, `Toast`, `Spinner`, `ErrorState` are the reusable UI primitives — never duplicate them; both grid and admin import from `components/ui`.

---

## 9. State stores (Zustand)

Six stores, one per concern. Full shapes + actions + the optimistic-update pattern in [`gridwork-frontend.md` § Stores](./gridwork-frontend.md#stores).

| Store | Responsibility | Persists to localStorage |
|---|---|---|
| `useAuthStore` | profile, JWT bootstrap status, login/logout actions | no (Supabase JS already persists session) |
| `useBoardsStore` | the user's boards, active board id, board switch action | activeBoardId only |
| `usePortfolioStore` | the active board's `PortfolioPayload`, projects, sub-projects, optimistic patches | no |
| `useActivitiesStore` | activities for the open sub-project, CRUD actions | no |
| `useGridUIStore` | selected cell, hovered row, open popover, view (portfolio/calendar/reports), expanded project groups | expanded groups + view |
| `useToastStore` | toast queue, push/dismiss actions | no |

The `apiClient.ts` wrapper attaches the JWT and unwraps the envelope. On `401` it clears auth and routes to `#/login`. On any other error code it surfaces `{ code, message }` to the caller, which decides whether to toast or render inline.

---

## 10. Auth flow

1. **Login submit.** `LoginPage` calls `supabase.auth.signInWithPassword({ email, password })`. On error, render an inline message under the form (no toast — keeps focus near the input). On success, the Supabase JS SDK stores the session in its own localStorage key.
2. **Session bootstrap.** `App.tsx` on mount calls `useAuthStore.bootstrap()` which:
   - reads `supabase.auth.getSession()` — if no session, route to `#/login`.
   - else calls `GET /api/auth/me` via `apiClient`. The Express handler verifies the JWT and returns the profile + boards. If `profile.status === 'suspended'` the API returns `403 USER_SUSPENDED` and the bootstrap clears auth and routes to login with a toast.
   - persists `activeBoardId` (from localStorage or first board) into `useBoardsStore`.
3. **Per-request JWT.** Before every `fetch`, `apiClient` calls `supabase.auth.getSession()` and attaches `Authorization: Bearer <access_token>`. No JWT? Skip header — the server will respond `401 UNAUTHENTICATED` and the client routes to login.
4. **Express verification.** `requireAuth` middleware: takes the bearer token, calls `supabaseAdmin.auth.getUser(token)`. On success looks up the matching `profiles` row. If `status === 'suspended'` returns `403 USER_SUSPENDED` immediately. Attaches `req.profile` and `req.userId`.
5. **Route guards.** Frontend guards in `Router.tsx` (admin route requires `profile.role === 'admin'`; portfolio routes require a board membership). Backend guards: `requireBoardMember(boardIdParam)`, `requireBoardAdmin(boardIdParam)`, `requireGlobalAdmin`, `requireActivityAuthorOrAdmin(activityIdParam)`.
6. **Logout.** `useAuthStore.logout()` calls `supabase.auth.signOut()`, clears stores, routes to `#/login`.
7. **Token expiry.** Supabase JS auto-refreshes the access token in the background. If a refresh fails (network/revoked), the next API call hits `401` and we redirect to login.

---

## 11. AI integration

AI features are out of scope for MVP — see section 16.

---

## 12. Shared types diff

Implementer (Phase 3) applies these. backend-api and frontend-builder must **NOT** edit `src/types/**` in Phase 2; they only import from it.

Full diff: [`./gridwork-types-delta.md`](./gridwork-types-delta.md). High-level additions:

- New `Activity` interface, `ACTIVITY_TYPE` enum (`meeting | milestone | progress | note | block`), `ACTIVITY_TYPE_META` map.
- New `ListActivitiesResponse`, `CreateActivityInput`, `UpdateActivityInput`, `ListActivitiesQuery`.
- New `LoginInput`, `LoginResponse` for `POST /api/auth/login`.
- Two new fields on `SubProject` and `SubProjectWithRelations`: `progressPrev: number | null`, `progressUpdatedAt: ISODateString | null`.
- New constant `AT_RISK_STALE_DAYS = 14` in `domain.ts`.
- Error code string union expansion (`USER_SUSPENDED`, `NOT_BOARD_MEMBER`, `BOARD_NOT_FOUND`, `RLS_DENIED`, etc.) — see types-delta.
- AI types (`SummarizeBoardInput`, `SuggestNextStepInput`, ...) and `SetBoardMembersInput` stay in `src/types/api.ts` as MVP-unused stubs.

---

## 13. Build order / phase 2 split

Builders run in parallel. The contract surface (`src/types/**`) is locked by the implementer; until that lands, both builders work against the planned shapes documented here and in types-delta. The order below is per-builder — between builders there are no synchronous dependencies because the type contract is shared.

### Phase 2A — backend-api (owns `src/api/**` and `supabase/**`)

- [ ] Write `supabase/migrations/0001__init_schema.sql` per the spec in [`gridwork-backend.md`](./gridwork-backend.md#data-model).
- [ ] Write `supabase/seed.sql` mirroring `project-management/project/src/data.js`.
- [ ] Create `src/api/server.ts` Express app with middleware stack (cors, helmet, morgan, express.json, errorHandler).
- [ ] Create `src/api/supabaseAdmin.ts` (service role client) and `src/api/env.ts` (Zod-validated env at boot; do NOT require `GEMINI_API_KEY`).
- [ ] Implement `requireAuth`, `requireBoardMember`, `requireBoardAdmin`, `requireGlobalAdmin`, `requireActivityAuthorOrAdmin` middleware.
- [ ] Implement `/api/auth/*` routes.
- [ ] Implement `/api/boards/*` routes (incl. `/portfolio` and the two `/members` delta routes).
- [ ] Implement `/api/projects/*` routes.
- [ ] Implement `/api/sub-projects/*` routes (incl. reorder + member delta).
- [ ] Implement `/api/activities/*` routes.
- [ ] Implement `/api/admin/*` routes.
- [ ] Zod schemas in `src/api/schemas/` colocated next to their routes (or `src/api/schemas/*.ts`).
- [ ] Per-route happy + 401/403/404/422 integration tests under `tests/integration/api/` (qa-tester will expand).

### Phase 2B — frontend-builder (owns `src/frontend/**`)

- [ ] Port `:root` tokens verbatim to `src/frontend/styles/tokens.css` (token values listed in [`gridwork-frontend.md`](./gridwork-frontend.md#design-tokens)).
- [ ] Set up `src/frontend/main.tsx`, `App.tsx`, `Router.tsx` (hash router), `Providers.tsx`.
- [ ] Build `lib/supabaseClient.ts` (anon key, auth only — no realtime) and `lib/apiClient.ts` (JWT attach, envelope unwrap, 401 redirect).
- [ ] Build Zustand stores: `useAuthStore`, `useBoardsStore`, `usePortfolioStore`, `useActivitiesStore`, `useGridUIStore`, `useToastStore`.
- [ ] Build `LoginPage` with dev-only demo-creds box (`import.meta.env.DEV` guard).
- [ ] Build `AppBar`, `BoardSwitcher`, `UserMenu`, `Toolbar`, `SheetFooter`, `ViewSwitcher`.
- [ ] Build `Grid` + `GridHeader` + `ProjectGroupRow` + `SubProjectRow` + the 9 cell editors per the per-cell spec in `gridwork-frontend.md`.
- [ ] Wire optimistic updates with rollback for `PUT /api/sub-projects/:id`.
- [ ] Build `CalendarView` + `ActivityModal`.
- [ ] Build `ReportsView` + `WeekStrip` + `WeekCard`.
- [ ] Build `AdminPage` with `UsersPanel`, `BoardsPanel`, `UserEditModal`, `BoardEditModal`, `MemberPicker`, `ConfirmDialog`.
- [ ] Wire window `focus` event to refetch active board portfolio + activities (debounced ≥ 2 s since last fetch).
- [ ] Toasts + error states everywhere a fetch can fail.

### Anti-collision matrix

| Path | Owned by | Other builder may do |
|---|---|---|
| `src/api/**` | backend-api | read only |
| `src/frontend/**` | frontend-builder | read only |
| `supabase/**` | backend-api | read only |
| `src/types/**` | implementer (Phase 3) | both builders read only |
| `docs/specs/**` | architect | both builders read only |
| `tests/integration/api/**` | backend-api seeds; qa-tester extends | — |
| `tests/integration/frontend/**` | frontend-builder seeds; qa-tester extends | — |
| `tests/e2e/**` | qa-tester | — |

---

## 14. Edge cases & error handling

- **Empty board (zero projects).** Portfolio renders an `EmptyState` with "+ Create your first project" CTA (editor/admin only). Viewer sees a passive "No projects yet" message.
- **Empty project (zero sub-projects).** Project group row renders with an `AddRow` inline below it for editors/admins. Viewer sees no AddRow.
- **User has zero boards.** Router pushes to `#/no-access` with a message and a link to contact admin.
- **200+ rows.** No virtualization in MVP (CSS Grid handles a few hundred rows well). Section 15 lists this as a perf check. Add virtualization (e.g. tanstack-virtual) only if profiler shows jank past 300 rows.
- **Concurrent cell edit (two users editing the same cell).** Last-write-wins. The server response is canonical; the second client's optimistic patch is overwritten by the response. No conflict detection in MVP.
- **Drag-reorder collision.** When `(prev + next) / 2` would produce a non-integer (gap of 1), the server renumbers the contiguous run (rows with the same `project_id`, ordered by current position) back to 100, 200, 300, … inside a single transaction. The handler returns the affected rows; the client replaces them.
- **401 token expiry.** apiClient catches `401`, calls `useAuthStore.logout()`, routes to `#/login?next=<currentHash>`.
- **403 suspended.** apiClient detects `code === 'USER_SUSPENDED'`, clears auth, toast "บัญชีของคุณถูกระงับ".
- **Read 403s collapse to 404.** Per memory: GET routes that fail board-membership return `404 BOARD_NOT_FOUND` (not 403) to prevent UUID enumeration. Write routes return `403 NOT_BOARD_MEMBER` (the request already proves the user knows the id).
- **Activity edit by non-author non-admin.** Backend returns `403 FORBIDDEN`; frontend hides the edit/delete buttons unless the user matches.
- **Suspended user appearing in pickers.** Member-picker filters out `status === 'suspended'`. Existing rows still display the suspended user's name (with a "suspended" tag in admin view).
- **Realtime not implemented.** Stale view is mitigated by window-focus refetch + `↻` button. Document this in tooltips.
- **No internet.** apiClient surfaces `code: 'NETWORK_ERROR'`. Toast: "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต / Check your connection".

### Error envelope reminder

All error responses:

```ts
{ ok: false, error: { code: string, message: string, details?: unknown } }
```

User-facing copy is held in the frontend (`src/frontend/lib/errorMessages.ts`). The server provides a stable `code` and a fallback `message` in English; the frontend overrides with localized Thai/English per the design.

Full error-code registry: [`gridwork-backend.md` § Error codes](./gridwork-backend.md#error-codes).

---

## 15. Test scenarios

### Backend (vitest + supertest, real Supabase test project — no mocks)

- `POST /api/auth/login` — happy path returns `{ access_token, profile }`; suspended user returns `403 USER_SUSPENDED`; wrong password returns `401 INVALID_CREDENTIALS`.
- `GET /api/auth/me` — happy + 401 (no token).
- `GET /api/boards/:id/portfolio` — happy (member) + 404 (non-member) + 404 (missing id).
- `POST /api/projects` — happy + 400 (bad payload) + 403 (viewer) + 404 (board not member).
- `PUT /api/sub-projects/:id` — single-field cell patch + auto-progress on status change + reverse-derive status on progress change.
- `PUT /api/sub-projects/:id/reorder` — within-project + cross-project + collision triggering segment renumber.
- `POST /api/boards/:id/members` — happy + 409 (already member) + 403 (non-admin caller).
- `POST /api/activities` / `PUT /api/activities/:id` — author can edit; non-author non-admin returns 403; admin can edit anyone's.
- `PUT /api/admin/users/:id` with `status: 'suspended'` — subsequent `GET /api/auth/me` for that user returns `403 USER_SUSPENDED`.

### Frontend (vitest + React Testing Library)

- `StatusCell` renders the right `STATUS_OPTIONS` chip colors for each value.
- `useGridKeyboardNav` moves selection on Arrow keys; `Enter` opens cell editor; `Esc` closes popover.
- `usePortfolioStore.patchSubProject` applies optimistic patch and rolls back on API error (with toast).
- `MemberPicker` filters out suspended profiles.
- `LoginPage` demo-creds box renders when `import.meta.env.DEV === true`, hidden otherwise.

### E2E (Playwright — critical flows)

1. **Login → board → edit cell persists.** Log in as seeded editor, see portfolio, click status cell on row 1, choose "UAT", reload page, assert cell still says "UAT".
2. **Admin → create board + add member.** Log in as admin, go to `#/admin?tab=boards`, click "+ New Board", fill modal, add seeded editor as member, save. Log out, log in as that editor, assert new board appears in BoardSwitcher.
3. **Suspend user → login rejected.** Log in as admin, open seeded editor, set status to `suspended`, save. Log out, attempt to log in as that editor, assert toast "บัญชีของคุณถูกระงับ" and remain on `#/login`.

(qa-tester will expand: viewer cannot edit, board switcher persists across reload, drag-reorder, calendar activity create, reports week strip render.)

---

## 16. Out of scope for MVP

- **AI / Gemini integration.** No `/api/ai/*` routes, no Gemini SDK import, no `GEMINI_API_KEY` requirement. The package stays installed. AI type stubs (`SummarizeBoardInput`, `SuggestNextStepInput`, `SummarizeBoardResponse`, `SuggestNextStepResponse`) stay in `src/types/api.ts` for v2 type-shape compatibility. No prototype JSX contains AI-themed UI, so no surface needs hiding.
- **Realtime presence / live grid updates.** RLS policies on `sub_projects` and friends are written realtime-ready (per-row SELECT keyed on board membership) so v2 can wire `supabase.channel('postgres_changes')` without a migration. MVP uses refetch-on-focus + `↻` button.
- **Hard-delete of users.** Suspension only. No `DELETE /api/admin/users/:id` endpoint. Authored data is retained.
- **Comments, attachments, mentions, notifications.**
- **Mobile / tablet responsive layout.** Design assumes desktop ≥ 1280 px.
- **CSV import / export, bulk row operations, theme switcher, SSO.**
- **Self-service password reset UI** (admin rotates passwords via Supabase Dashboard for MVP; v2 wires the Supabase Auth recovery email flow).
- **Replace-all board membership.** `SetBoardMembersInput` remains in types as a v2 stub but the API only ships delta routes (`POST/DELETE /members`).
- **Per-user profile self-edit page.**
- **Internationalization.** Thai labels are baked inline per the prototype (`labelTh` on enums). No i18n framework.

---

## 17. Open questions (deferred — revisit in v2)

These were resolved for MVP but flagged as worth revisiting:

1. **Position renumbering strategy.** Chose gap-100 with segment renumber on collision. Simple and works for the expected scale (hundreds of rows per board). May need fractional indexing (e.g. `lexorank`) if write-contention from many editors triggers frequent segment renumbers. Revisit if telemetry shows > 1 % of reorders triggering renumber.
2. **Realtime.** Deferred. The RLS-readiness means flipping it on in v2 is a frontend-only change (subscribe to `postgres_changes` filtered by current board's project ids). Revisit when concurrent multi-user editing becomes common.
3. **User deletion.** Soft-delete only. Some compliance regimes (GDPR right-to-erasure) eventually require hard-delete. Plan a `POST /api/admin/users/:id/erase` for v2 that nullifies `lead_id`, reassigns `author_id` of activities to a "[deleted user]" sentinel, then deletes the profile + `auth.users` row.
4. **Demo creds on login.** Kept dev-only (`import.meta.env.DEV`). Production strips it via dead-code elimination. If staging builds ever need a "demo mode" the env guard will need to flip to a runtime flag.

---

End of master spec. Builders: read your supplement before writing any code.
