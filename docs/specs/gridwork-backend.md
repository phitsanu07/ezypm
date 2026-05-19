# GridWork — Backend Spec (`backend-api` source of truth)

Read [`./gridwork-master.md`](./gridwork-master.md) first. This file is the implementation contract for `src/api/**` and `supabase/migrations/**`. Do NOT edit `src/frontend/**` or `src/types/**`.

---

## Server bootstrap

- `src/api/server.ts` — Express app. Composition order is strict:
  1. `cors()` — allow `http://localhost:5173` in dev; an env-driven allowlist in prod.
  2. `helmet()` with defaults; CSP relaxed for the API (no HTML served).
  3. `morgan('dev')` in dev; `'combined'` in prod.
  4. `express.json({ limit: '256kb' })`.
  5. `express.urlencoded({ extended: false })`.
  6. Per-route handlers (each route file mounts its own router).
  7. 404 fallback handler — emits the envelope `{ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }`.
  8. Global `errorHandler` — last in the chain. Maps thrown errors to envelope responses with stable status codes.
- `src/api/env.ts` — Zod-validated env at boot. **Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT` (default 3001). **NOT required** (do not validate): `GEMINI_API_KEY` — server boots cleanly without it.
- `src/api/supabaseAdmin.ts` — `createClient(url, serviceRoleKey, { auth: { persistSession: false } })`. Single instance exported.
- `src/api/index.ts` — entry point that calls `env.ts`, mounts the app, and listens on `PORT`.

Path alias: import as `@/api/...` and `@/types`.

---

## Middleware stack

| Middleware | File | Purpose |
|---|---|---|
| `requireAuth` | `src/api/middleware/requireAuth.ts` | Reads `Authorization: Bearer <jwt>`. Calls `supabaseAdmin.auth.getUser(token)`. If `data.user` is missing → `401 UNAUTHENTICATED`. Loads `profiles` row; if missing → `401 PROFILE_MISSING`; if `status === 'suspended'` → `403 USER_SUSPENDED`. Attaches `req.userId: string`, `req.profile: Profile`. |
| `requireBoardMember(boardIdParam)` | `src/api/middleware/requireBoardMember.ts` | Curried by the URL param name (default `boardId`). Reads the id, queries `board_members` for the current user. If not a member, returns `404 BOARD_NOT_FOUND` on GET routes (read 403→404 collapse) or `403 NOT_BOARD_MEMBER` on write routes. Admin global role bypasses this only on read routes; on write routes admin still must be a board member unless explicitly allowed by the route. |
| `requireBoardAdmin(boardIdParam)` | `src/api/middleware/requireBoardAdmin.ts` | True iff `profile.role === 'admin'` OR `board.owner_id === req.userId`. Otherwise `403 FORBIDDEN`. Used for board mutations and member-add/remove. |
| `requireGlobalAdmin` | `src/api/middleware/requireGlobalAdmin.ts` | `profile.role === 'admin'`. Otherwise `403 FORBIDDEN`. Used on `/api/admin/*`. |
| `requireActivityAuthorOrAdmin(activityIdParam)` | `src/api/middleware/requireActivityAuthorOrAdmin.ts` | Loads the activity, allows iff `author_id === req.userId` OR `profile.role === 'admin'`. Otherwise `403 FORBIDDEN`. Used on `PUT /api/activities/:id` and `DELETE /api/activities/:id`. |
| `validate(schema)` | `src/api/middleware/validate.ts` | Wraps a Zod schema. Parses `req.body`. On error → `400 Z_VALIDATION` with `details: error.flatten()`. Attaches parsed object as `req.validated`. |
| `errorHandler` | `src/api/middleware/errorHandler.ts` | Last middleware. Converts thrown `ApiError`s and any unexpected error to the envelope. Logs unexpected errors with `console.error` (server side only). Never leaks stack traces to the client in prod. |

Custom error class: `src/api/lib/ApiError.ts` — `new ApiError(code, message, status, details?)`. Routes throw `ApiError` instead of calling `res.status(...).json(...)` directly.

---

## Route table

Every route returns the envelope. Auth column: `auth` = `requireAuth` only; `member(:id)` = `requireAuth + requireBoardMember(:id)`; `boardAdmin(:id)` = `requireAuth + requireBoardAdmin(:id)`; `globalAdmin` = `requireAuth + requireGlobalAdmin`.

### Auth & bootstrap

| Method | Path | Purpose | Auth | Request schema | Response `data` | Errors |
|---|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | Email + password login. Thin wrapper around `supabase.auth.signInWithPassword` so the FE has one consistent envelope. | none | `LoginSchema` (email, password) | `LoginResponse` (access_token, refresh_token, profile) | `400 Z_VALIDATION`, `401 INVALID_CREDENTIALS`, `403 USER_SUSPENDED` |
| `POST` | `/api/auth/logout` | Revoke the current session server-side (Supabase admin signOut). FE also clears its session. | auth | none | `{ ok: true }` | `401 UNAUTHENTICATED` |
| `GET` | `/api/auth/me` | Returns the current profile + the boards they belong to (with metadata). | auth | none | `MeResponse` (profile + BoardWithMeta[]) | `401 UNAUTHENTICATED`, `403 USER_SUSPENDED` |

### Boards

| Method | Path | Purpose | Auth | Request schema | Response `data` | Errors |
|---|---|---|---|---|---|---|
| `GET` | `/api/boards` | List boards the current user is a member of. | auth | none | `ListBoardsResponse` (BoardWithMeta[]) | `401` |
| `GET` | `/api/boards/:id` | One board with member list + counts. | member(:id) | none | `GetBoardResponse` (BoardWithMeta) | `404 BOARD_NOT_FOUND` |
| `GET` | `/api/boards/:id/portfolio` | Full portfolio payload (board + members + projects + sub-projects with relations). | member(:id) | none | `GetPortfolioResponse` (PortfolioPayload) | `404 BOARD_NOT_FOUND` |
| `POST` | `/api/boards/:id/members` | Add one member. | boardAdmin(:id) | `AddBoardMemberSchema` `{ userId }` | `Board` | `400 Z_VALIDATION`, `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 USER_NOT_FOUND`, `409 ALREADY_MEMBER` |
| `DELETE` | `/api/boards/:id/members/:userId` | Remove one member. Cannot remove the owner. | boardAdmin(:id) | none | `{ id: ":userId" }` | `403 FORBIDDEN`, `404 BOARD_NOT_FOUND`, `404 NOT_A_MEMBER`, `409 CANNOT_REMOVE_OWNER` |

### Projects

| Method | Path | Purpose | Auth | Request schema | Response `data` | Errors |
|---|---|---|---|---|---|---|
| `POST` | `/api/projects` | Create a project inside a board. | member(body.boardId) AND role in {editor, admin} | `CreateProjectSchema` | `CreateProjectResponse` (Project) | `400`, `403 FORBIDDEN` (viewer), `404 BOARD_NOT_FOUND` |
| `PUT` | `/api/projects/:id` | Update fields and/or reorder via `position`. | member(project.board_id) AND role in {editor, admin} | `UpdateProjectSchema` | `UpdateProjectResponse` (Project) | `400`, `403`, `404 PROJECT_NOT_FOUND` |
| `DELETE` | `/api/projects/:id` | Hard delete, cascades to `sub_projects`. | member(project.board_id) AND role in {editor, admin} | none | `{ id }` | `403`, `404` |

### Sub-projects

| Method | Path | Purpose | Auth | Request schema | Response `data` | Errors |
|---|---|---|---|---|---|---|
| `POST` | `/api/sub-projects` | Create a sub-project. Auto-position to `max(position) + 100`. | member(project.board_id), editor/admin | `CreateSubProjectSchema` | `CreateSubProjectResponse` (SubProjectWithRelations) | `400`, `403`, `404 PROJECT_NOT_FOUND` |
| `PUT` | `/api/sub-projects/:id` | Patch one or more fields. Auto-progress logic applied server-side. | member(sub.board_id), editor/admin | `UpdateSubProjectSchema` | `UpdateSubProjectResponse` (SubProjectWithRelations) | `400`, `403`, `404 SUBPROJECT_NOT_FOUND` |
| `PUT` | `/api/sub-projects/:id/reorder` | Move row to a target project + position. May trigger segment renumber. | member(sub.board_id), editor/admin | `ReorderSubProjectSchema` `{ targetProjectId, position }` | `ProjectWithSubs[]` (the two affected projects' fresh state) | `400`, `403`, `404 SUBPROJECT_NOT_FOUND`, `404 TARGET_PROJECT_NOT_FOUND`, `422 BOARDS_DIFFER` |
| `DELETE` | `/api/sub-projects/:id` | Hard delete. Cascades to `sub_project_members` and `activities`. | member(sub.board_id), editor/admin | none | `{ id }` | `403`, `404` |
| `POST` | `/api/sub-projects/:id/members` | Add team member (Team column). | member(sub.board_id), editor/admin | `AddSubProjectMemberSchema` `{ userId }` | `SubProjectWithRelations` | `400`, `403`, `404`, `409 ALREADY_MEMBER` |
| `DELETE` | `/api/sub-projects/:id/members/:userId` | Remove team member. | member(sub.board_id), editor/admin | none | `{ id: ":userId" }` | `403`, `404 NOT_A_MEMBER` |

**Auto-progress logic (server-side, in the `PUT /api/sub-projects/:id` handler):**

- If the patch sets `status` AND not `progress`: server writes `progress = STATUS_PROGRESS[status]`.
- If the patch sets `progress` AND not `status`: server writes `status = deriveStatusFromProgress(progress)`.
- If the patch sets BOTH: trust the patch, write both as given (client opted out of auto-derive).
- On any progress change, also write `progress_prev = (current row's progress before update)` and `progress_updated_at = now()`.

**Reorder algorithm:**

1. Verify the target project belongs to the same board (else `422 BOARDS_DIFFER`).
2. Take a row-level lock on rows of `targetProjectId` ordered by position (Postgres `for update`).
3. Compute the desired insertion point. If positions of neighbours allow `(prev + next) / 2 ≥ prev + 2`, write that integer.
4. Else renumber that whole project's sub_projects to `100, 200, 300, …` and place the moved row at the inserted index × 100.
5. Commit. Return both `ProjectWithSubs` (source + target) for the FE to splice in.

### Activities

| Method | Path | Purpose | Auth | Request schema | Response `data` | Errors |
|---|---|---|---|---|---|---|
| `GET` | `/api/sub-projects/:id/activities` | List activities for a sub-project (optionally bounded by `from`/`to` ISO dates). | member(sub.board_id) | `ListActivitiesQuery` (query string: `from?`, `to?`) | `ListActivitiesResponse` (`Activity[]`) | `400`, `404 SUBPROJECT_NOT_FOUND` |
| `POST` | `/api/activities` | Create an activity attached to a sub-project. `author_id` = current user. | member(sub.board_id), editor/admin | `CreateActivitySchema` | `Activity` | `400`, `403`, `404 SUBPROJECT_NOT_FOUND` |
| `PUT` | `/api/activities/:id` | Edit. Author or admin only. | `requireActivityAuthorOrAdmin(:id)` | `UpdateActivitySchema` | `Activity` | `400`, `403 FORBIDDEN`, `404 ACTIVITY_NOT_FOUND` |
| `DELETE` | `/api/activities/:id` | Delete. Author or admin only. | `requireActivityAuthorOrAdmin(:id)` | none | `{ id }` | `403`, `404` |

### Admin

| Method | Path | Purpose | Auth | Request schema | Response `data` | Errors |
|---|---|---|---|---|---|---|
| `GET` | `/api/admin/users` | List all profiles (any status). | globalAdmin | none | `ListUsersResponse` (`Profile[]`) | `401`, `403` |
| `POST` | `/api/admin/users` | Invite a user: creates the `auth.users` row via `supabaseAdmin.auth.admin.createUser` (with a temp password set by admin), then inserts the `profiles` row. | globalAdmin | `InviteUserSchema` (+ `password` field added for MVP) | `Profile` | `400`, `403`, `409 EMAIL_TAKEN` |
| `PUT` | `/api/admin/users/:id` | Update profile fields (name, nameTh, role, status, color). Suspending sets `status='suspended'` + `suspended_at = now()`. | globalAdmin | `UpdateUserSchema` | `Profile` | `400`, `403`, `404 USER_NOT_FOUND`, `409 CANNOT_SUSPEND_SELF` |
| `POST` | `/api/admin/boards` | Create a board. Optionally with initial `memberIds`. | globalAdmin | `CreateBoardSchema` | `Board` | `400`, `403` |
| `PUT` | `/api/admin/boards/:id` | Rename / re-color / re-icon a board. | globalAdmin | `UpdateBoardSchema` | `Board` | `400`, `403`, `404 BOARD_NOT_FOUND` |
| `DELETE` | `/api/admin/boards/:id` | Hard delete a board. Cascades to projects/sub-projects/activities. | globalAdmin | none | `{ id }` | `403`, `404 BOARD_NOT_FOUND` |

**Note on `POST /api/admin/users`:** the `InviteUserInput` type in `src/types/api.ts` will be extended (types-delta) to include an optional `password: string` field. backend-api must NOT modify the type; types-delta documents the change and implementer applies it in Phase 3.

---

## Zod schemas

Place schemas in `src/api/schemas/<resource>.ts`. Each schema must:

- Import `z` from `zod`.
- Mirror exactly the matching TS type in `src/types/api.ts`. Use `z.infer<typeof X>` to keep them in sync.
- Reject unknown keys with `.strict()` (no extra fields).
- Use `z.string().uuid()` for ids, `z.string().email()` for email, `z.string().min(1).max(120)` for names, `z.number().int().min(0).max(100)` for progress, `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` for `ISODateOnly`, `z.enum(SUB_PROJECT_STATUS_VALUES)` for status, etc.

Schema names:

| File | Exports |
|---|---|
| `src/api/schemas/auth.ts` | `LoginSchema` |
| `src/api/schemas/board.ts` | `CreateBoardSchema`, `UpdateBoardSchema`, `AddBoardMemberSchema` |
| `src/api/schemas/project.ts` | `CreateProjectSchema`, `UpdateProjectSchema` |
| `src/api/schemas/subProject.ts` | `CreateSubProjectSchema`, `UpdateSubProjectSchema`, `ReorderSubProjectSchema`, `AddSubProjectMemberSchema` |
| `src/api/schemas/activity.ts` | `CreateActivitySchema`, `UpdateActivitySchema`, `ListActivitiesQuery` |
| `src/api/schemas/admin.ts` | `InviteUserSchema`, `UpdateUserSchema` (re-uses board schemas) |

---

## Data model

Per-table column lists, indexes, and RLS policy intent. backend-api translates these into SQL in `0001__init_schema.sql`.

### `profiles`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, FK → `auth.users.id` ON DELETE CASCADE |
| `email` | text | NOT NULL, UNIQUE (case-insensitive — use citext or lower() expression index) |
| `name` | text | NOT NULL |
| `name_th` | text | NOT NULL DEFAULT '' |
| `role` | text | NOT NULL, CHECK in (`admin`, `editor`, `viewer`), DEFAULT `editor` |
| `status` | text | NOT NULL, CHECK in (`active`, `invited`, `suspended`), DEFAULT `active` |
| `suspended_at` | timestamptz | NULLABLE — set when status transitions to `suspended`, cleared on transition out |
| `color` | text | NOT NULL DEFAULT `#7C5CFF` |
| `initials` | text | NOT NULL — derived in API from name on create/update |
| `last_active_at` | timestamptz | NULLABLE |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now(), trigger-updated |

Indexes: `email` UNIQUE, `(role)`, `(status)`.

**RLS:** enable. Policies:

- `select_own_or_co_member`: USING `(id = auth.uid()) OR (id IN (SELECT bm2.user_id FROM board_members bm1 JOIN board_members bm2 ON bm1.board_id = bm2.board_id WHERE bm1.user_id = auth.uid()))`.
- No anon INSERT/UPDATE/DELETE (service role only).

### `boards`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `name` | text | NOT NULL |
| `name_th` | text | NULLABLE |
| `icon` | text | NOT NULL DEFAULT '▦' |
| `color` | text | NOT NULL DEFAULT `#7C5CFF` |
| `owner_id` | uuid | NOT NULL, FK → `profiles.id` ON DELETE RESTRICT |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | DEFAULT now(), trigger-updated |

Indexes: `(owner_id)`.

**RLS:** enable. `select_if_member`: `id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())`. Mutations service-role only.

### `board_members`

| Column | Type | Constraints |
|---|---|---|
| `board_id` | uuid | FK → `boards.id` ON DELETE CASCADE |
| `user_id` | uuid | FK → `profiles.id` ON DELETE CASCADE |
| `added_at` | timestamptz | DEFAULT now() |

Primary key: `(board_id, user_id)`. Index on `(user_id)` for "boards I belong to" lookup.

**RLS:** `select_self_or_co_member`. Mutations service-role only.

### `projects`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `board_id` | uuid | FK → `boards.id` ON DELETE CASCADE |
| `name` | text | NOT NULL |
| `name_th` | text | NULLABLE |
| `icon` | text | NOT NULL DEFAULT '◇' |
| `color` | text | NOT NULL DEFAULT `#7C5CFF` |
| `type` | text | CHECK in (`year_plan`, `ad_hoc`), DEFAULT `ad_hoc` |
| `position` | integer | NOT NULL |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | DEFAULT now(), trigger-updated |

Indexes: `(board_id, position)`.

**RLS:** `select_if_board_member`. Mutations service-role only.

### `sub_projects`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `project_id` | uuid | FK → `projects.id` ON DELETE CASCADE |
| `name` | text | NOT NULL |
| `name_th` | text | NULLABLE |
| `icon` | text | NOT NULL DEFAULT '◇' |
| `lead_id` | uuid | NULLABLE, FK → `profiles.id` ON DELETE SET NULL |
| `status` | text | CHECK in (`requirement`,`spec`,`dev`,`test`,`uat`,`go_live`), DEFAULT `requirement` |
| `priority` | text | CHECK in (`p1`,`p2`,`p3`,`p4`), DEFAULT `p3` |
| `due` | date | NULLABLE |
| `progress` | integer | NOT NULL DEFAULT 0, CHECK between 0 and 100 |
| `progress_prev` | integer | NULLABLE, CHECK between 0 and 100 |
| `progress_updated_at` | timestamptz | NULLABLE |
| `quarter` | text | NULLABLE |
| `tags` | text[] | NOT NULL DEFAULT '{}' |
| `position` | integer | NOT NULL |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | DEFAULT now(), trigger-updated |

Indexes: `(project_id, position)`, `(lead_id)`, `(status)`, `(due) WHERE due IS NOT NULL`.

**RLS:** `select_if_board_member` — join up through `projects → boards → board_members`. Mutations service-role only (realtime-ready for v2: when we enable channel subscriptions, SELECT policy already gates per-board access).

### `sub_project_members`

| Column | Type | Constraints |
|---|---|---|
| `sub_project_id` | uuid | FK → `sub_projects.id` ON DELETE CASCADE |
| `user_id` | uuid | FK → `profiles.id` ON DELETE CASCADE |
| `added_at` | timestamptz | DEFAULT now() |

Primary key: `(sub_project_id, user_id)`. Index on `(user_id)`.

**RLS:** `select_if_board_member` (transitive). Mutations service-role only.

### `activities`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `sub_project_id` | uuid | FK → `sub_projects.id` ON DELETE CASCADE |
| `author_id` | uuid | FK → `profiles.id` ON DELETE SET NULL |
| `type` | text | CHECK in (`meeting`,`milestone`,`progress`,`note`,`block`) |
| `title` | text | NOT NULL |
| `body` | text | NULLABLE |
| `occurs_at` | timestamptz | NOT NULL — when the activity happens (used for calendar) |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | DEFAULT now(), trigger-updated |

Indexes: `(sub_project_id, occurs_at)`, `(author_id)`, `(occurs_at)`.

**RLS:** `select_if_board_member` (transitive). Mutations service-role only.

### Triggers

`update_updated_at()` — a single PL/pgSQL function:

```text
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$
```

Applied as `BEFORE UPDATE FOR EACH ROW` on every table with `updated_at`.

---

## Migration files (Phase 2 will write these)

| File | Contents |
|---|---|
| `supabase/migrations/0001__init_schema.sql` | `create extension if not exists pgcrypto;` then all 7 tables + indexes + the `update_updated_at()` function + triggers per table + `alter table … enable row level security;` per table + all `create policy` statements. |
| `supabase/migrations/0002__seed_helpers.sql` | (optional) `v_board_portfolio` view if useful. backend-api may skip this file entirely if it builds the portfolio query in TypeScript. |
| `supabase/seed.sql` | One admin (matching a real Supabase auth user the dev creates), 6 editors/viewers, 2 boards, 3 projects per board, 4–6 sub-projects per project covering all status values, sample activities. Mirror the shape of `project-management/project/src/data.js`. |

---

## Error codes

Stable string codes — frontend keys off these for messaging.

| Code | HTTP | Meaning |
|---|---|---|
| `Z_VALIDATION` | 400 | Zod validation failed; `details` contains `error.flatten()` |
| `UNAUTHENTICATED` | 401 | Missing or invalid JWT |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password at `/api/auth/login` |
| `PROFILE_MISSING` | 401 | JWT valid but no `profiles` row — server-side data error |
| `USER_SUSPENDED` | 403 | `profile.status === 'suspended'` |
| `FORBIDDEN` | 403 | Generic permission failure (e.g. viewer attempting write, non-author editing activity) |
| `NOT_BOARD_MEMBER` | 403 | Write attempt without board membership |
| `RLS_DENIED` | 403 | Postgres rejected a query under RLS (defensive; should not happen via service-role path) |
| `BOARD_NOT_FOUND` | 404 | Board does not exist OR caller is not a member (read 403→404 collapse) |
| `PROJECT_NOT_FOUND` | 404 | Project missing |
| `SUBPROJECT_NOT_FOUND` | 404 | Sub-project missing |
| `ACTIVITY_NOT_FOUND` | 404 | Activity missing |
| `USER_NOT_FOUND` | 404 | Profile missing |
| `TARGET_PROJECT_NOT_FOUND` | 404 | Reorder target project missing |
| `NOT_A_MEMBER` | 404 | Removing a member who isn't on the board / team |
| `ALREADY_MEMBER` | 409 | Adding a member who is already there |
| `CANNOT_REMOVE_OWNER` | 409 | Trying to remove the board owner from members |
| `CANNOT_SUSPEND_SELF` | 409 | Admin trying to suspend their own account |
| `EMAIL_TAKEN` | 409 | Invite with an email that already exists |
| `BOARDS_DIFFER` | 422 | Reorder target lives in a different board |
| `RATE_LIMITED` | 429 | (reserved; not enforced in MVP outside `auth/login`) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `NOT_FOUND` | 404 | Unmatched route fallback |

Frontend's `errorMessages.ts` maps each code to localized copy.

---

## Test scaffolding

`tests/integration/api/setup.ts` creates a fresh schema or truncates the test Supabase project before each describe. Per memory rule: tests must hit a real Supabase project, never mocks.

Per-route happy + 401 + 403 + 404 + 400 cases as listed in [`gridwork-master.md` § 15](./gridwork-master.md#15-test-scenarios).
