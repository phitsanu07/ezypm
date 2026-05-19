# GridWork — Frontend Spec (`frontend-builder` source of truth)

Read [`./gridwork-master.md`](./gridwork-master.md) first. This file is the implementation contract for `src/frontend/**`. Do NOT edit `src/api/**` or `src/types/**`.

Design source files (READ-ONLY reference, do not import from):
`project-management/project/GridWork.html`, `login.html`, `admin.html`, `src/styles.css`, `src/*.jsx`. A mirror exists at `src/frontend/_design-reference/` and is excluded from TS build.

---

## Pages

Hash routing via tiny custom router (no `react-router-dom` — keep deps frozen). Module: `src/frontend/app/Router.tsx`.

### `#/login` — `LoginPage`

- Brand panel left, form right (matches `login.html` layout).
- Inputs: email, password. Submit calls `supabase.auth.signInWithPassword`. On success, route to `#/`.
- Inline error message under form on `INVALID_CREDENTIALS` or `USER_SUSPENDED`. No toast.
- **Dev-only demo creds box** — rendered iff `import.meta.env.DEV === true`. Lists 3 seeded accounts (admin / editor / viewer). Clicking a row pre-fills email + password. Vite strips it from prod bundles via dead-code elimination.
- Stores: `useAuthStore` (`status: 'idle' | 'signing-in' | 'error'`).

### `#/` — `PortfolioPage` (default board)

- Resolves the active board: localStorage `gridwork.activeBoardId.v1` → fallback to first board in `useBoardsStore.boards`. If user has zero boards: redirect to `#/no-access`.
- Renders `AppBar` + `Toolbar` + `<viewSwitcher selected>` view + `SheetFooter`.
- View toggle (in Toolbar): `portfolio | calendar | reports`. State in `useGridUIStore.view`.
- States: loading spinner (skeleton grid), error state with retry, empty state ("No projects yet" + CTA).

### `#/board/:id` — `PortfolioPage` (explicit board)

- Same as above but persists `:id` to `useBoardsStore.activeBoardId` (and localStorage).
- If the user is not a member of `:id`, backend returns `404 BOARD_NOT_FOUND`. FE redirects to `#/no-access`.

### `#/admin?tab=users|boards` — `AdminPage`

- Guard: `profile.role === 'admin'`, else redirect to `#/`.
- Tab parsed from `?tab=` (default `users`).
- Renders `AppBar` (with admin badge) + `UsersPanel` or `BoardsPanel`.
- Loading / empty / error states explicit.

### `#/no-access` — `NoBoardAccessPage`

- Shown when authed user has zero boards. Renders a centered card with "ขออภัย — คุณยังไม่มีบอร์ดที่เข้าถึงได้" and a "Contact admin" mailto link. Logout button at top right.

---

## Component tree

Full tree under `src/frontend/components/`. Each leaf component is a single file. Props use named TypeScript interfaces. No `React.FC`. No mutation of incoming props.

```
src/frontend/
├── main.tsx                          ← React root, mounts <App />
├── app/
│   ├── App.tsx                       ← Router + Providers + global error boundary
│   ├── Router.tsx                    ← hash router, route guards
│   └── Providers.tsx                 ← Toast portal + window-focus refetch listener
├── pages/
│   ├── LoginPage.tsx
│   ├── PortfolioPage.tsx             ← orchestrates view switching
│   ├── AdminPage.tsx                 ← orchestrates tab switching
│   └── NoBoardAccessPage.tsx
├── components/
│   ├── layout/
│   │   ├── AppBar.tsx                ← brand + BoardSwitcher + nav + UserMenu
│   │   ├── BoardSwitcher.tsx         ← dropdown of boards user belongs to
│   │   ├── UserMenu.tsx              ← avatar dropdown: profile / admin link / logout
│   │   ├── Toolbar.tsx               ← view toggle + refresh button + filters (future)
│   │   ├── ViewSwitcher.tsx          ← portfolio | calendar | reports
│   │   └── SheetFooter.tsx           ← row count, shipped count, at-risk count, avg progress
│   ├── grid/
│   │   ├── Grid.tsx                  ← top-level grid container; owns column widths
│   │   ├── GridHeader.tsx            ← sticky header row with resizable columns
│   │   ├── ProjectGroupRow.tsx       ← collapsible group header, project stats
│   │   ├── SubProjectRow.tsx         ← one row; renders 9 cells via cell router
│   │   ├── RowNumberCell.tsx         ← left gutter, sequential 1..N
│   │   ├── AddRow.tsx                ← "+ Add row" inline at bottom of a project
│   │   ├── useGridKeyboardNav.ts     ← Arrow/Tab/Enter/F2/Esc handler
│   │   └── useGridDragDrop.ts        ← native HTML5 DnD for reorder
│   ├── cells/
│   │   ├── CellShell.tsx             ← shared border/focus styles; renders editor on activation
│   │   ├── NameCell.tsx              ← icon + name + nameTh + tag dots
│   │   ├── AssigneeCell.tsx          ← avatar of lead; click → MemberPicker popover
│   │   ├── TeamCell.tsx              ← stacked avatars; click → MultiMemberPicker
│   │   ├── StatusCell.tsx            ← STATUS_OPTIONS chip; click → status picker
│   │   ├── PriorityCell.tsx          ← PRIORITY_OPTIONS chip; click → priority picker
│   │   ├── DateCell.tsx              ← formatted date; click → date input
│   │   ├── ProgressCell.tsx          ← bar + % + delta indicator vs progressPrev
│   │   ├── TagsCell.tsx              ← TAG_COLORS chips; click → tag editor
│   │   ├── TextCell.tsx              ← plain text edit (used for quarter)
│   │   ├── Popover.tsx               ← anchored, escape/click-outside dismiss
│   │   ├── MemberPicker.tsx          ← single-select; suspended filtered out
│   │   └── MultiMemberPicker.tsx     ← multi-select with checkboxes
│   ├── calendar/
│   │   ├── CalendarView.tsx          ← month grid of activities
│   │   ├── ActivityModal.tsx         ← create/edit activity
│   │   └── ActivityChip.tsx          ← inline activity pill on a date
│   ├── reports/
│   │   ├── ReportsView.tsx           ← week-by-week strip of cards
│   │   ├── WeekStrip.tsx
│   │   └── WeekCard.tsx
│   ├── admin/
│   │   ├── UsersPanel.tsx            ← table of profiles
│   │   ├── BoardsPanel.tsx           ← table of boards with member counts
│   │   ├── UserEditModal.tsx
│   │   ├── BoardEditModal.tsx
│   │   ├── MemberPicker.tsx          ← reused in BoardEditModal
│   │   └── ConfirmDialog.tsx
│   └── ui/
│       ├── Avatar.tsx                ← circle, init or photo, color from profile.color
│       ├── Chip.tsx                  ← rounded pill, bg/fg from token
│       ├── Modal.tsx                 ← centered dialog, escape closes
│       ├── Spinner.tsx
│       ├── Toast.tsx                 ← stacked toasts, auto-dismiss 4 s
│       ├── EmptyState.tsx
│       ├── ErrorState.tsx
│       └── IconButton.tsx
├── store/
│   ├── useAuthStore.ts
│   ├── useBoardsStore.ts
│   ├── usePortfolioStore.ts
│   ├── useActivitiesStore.ts
│   ├── useGridUIStore.ts
│   └── useToastStore.ts
├── lib/
│   ├── apiClient.ts                  ← fetch wrapper (JWT attach, envelope unwrap)
│   ├── supabaseClient.ts             ← createClient(url, anonKey) — Auth ONLY (no realtime in MVP)
│   ├── http-errors.ts                ← ApiClientError class + code → message map (errorMessages.ts)
│   ├── errorMessages.ts              ← localized copy per code
│   ├── dates.ts                      ← formatISODate, formatDateOnly, isBefore (UTC)
│   └── atRisk.ts                     ← isAtRisk(sub, AT_RISK_STALE_DAYS, now)
└── styles/
    ├── tokens.css                    ← :root from prototype, verbatim (below)
    ├── reset.css
    ├── app.css                       ← .app, .sidebar, .appbar, .toolbar, .sheet-foot
    ├── grid.css                      ← .grid, .grid-header, .row, .cell
    ├── cells.css                     ← chip styles, popover, member picker
    ├── calendar.css
    ├── reports.css
    ├── admin.css
    ├── login.css
    └── modal.css
```

---

## Excel-grid component breakdown

### `Grid.tsx`

- Top-level. Receives `PortfolioPayload` from `usePortfolioStore`.
- Owns column widths (default + per-column overrides) in `useGridUIStore.columnWidths`. Persisted to localStorage `gridwork.columnWidths.v1`.
- CSS layout: `display: grid; grid-template-rows: 40px repeat(N, 36px);` — header row + row per sub-project.
- Renders `GridHeader` first (sticky via `position: sticky; top: 0; z-index: 2`), then one `ProjectGroupRow` per project (collapsible), then `SubProjectRow`s for each child, then `AddRow` at the bottom of each expanded project.

### `GridHeader.tsx`

- One row, 9 columns + row-number gutter.
- Each column header has a resizer handle on the right edge (`onMouseDown` → start drag → `onMouseMove` updates width in store, clamped 80–400 px).
- Columns and order:
  | # | Column | Label | Editor |
  |---|---|---|---|
  | 1 | name | "Sub-project" | TextCell + nameTh |
  | 2 | lead | "Assignee" | AssigneeCell (MemberPicker) |
  | 3 | team | "Team" | TeamCell (MultiMemberPicker) |
  | 4 | status | "Status" | StatusCell (status picker) |
  | 5 | priority | "Priority" | PriorityCell |
  | 6 | due | "Due" | DateCell |
  | 7 | progress | "Progress" | ProgressCell (slider + number) |
  | 8 | tags | "Tags" | TagsCell |
  | 9 | quarter | "Quarter" | TextCell |

### `ProjectGroupRow.tsx`

- Spans all columns (grid `column: 1 / -1`).
- Renders chevron (expanded state in `useGridUIStore.expandedProjects`), project icon, name, project type tag, project stats (sub count, shipped, at-risk, avg progress).
- Right-click or hover menu: rename, change color/icon, delete.

### `SubProjectRow.tsx`

- One row, owns one `SubProjectWithRelations`.
- Renders 9 cell components, each as a `CellShell` wrapper.
- Selection state: `useGridUIStore.selectedCell: { rowId, columnId } | null`. Click cell → select; Enter or F2 → activate editor.
- Drag handle on row-number cell. `useGridDragDrop` wires native HTML5 DnD: `dragstart` records `subProjectId` + `projectId`; `dragover` on another row computes insertion index; `drop` calls `usePortfolioStore.reorderSubProject(id, targetProjectId, position)`.

### Per-cell editor variants

All cell editors share the activation pattern: click on the cell selects it. Pressing Enter, F2, or double-clicking opens the editor (a `Popover` anchored to the cell, or an inline input). Esc closes without saving; Tab or Enter commits.

- **NameCell.** Display: icon + name (and nameTh in muted style below). Editor: inline `<input>` two-line — name + nameTh. Commit on blur or Enter.
- **AssigneeCell.** Display: 24 px avatar with profile color + initials, or "—" if `leadId == null`. Editor: `MemberPicker` popover (search + scrollable list of board members; suspended filtered; "Unassign" row at top).
- **TeamCell.** Display: up to 3 stacked avatars + `+N` chip if more. Editor: `MultiMemberPicker` (checkbox list, board members only, suspended filtered).
- **StatusCell.** Display: `Chip` colored from `STATUS_OPTIONS` (bg/fg, dot). Editor: list of 6 status options (label + labelTh).
- **PriorityCell.** Display: `Chip` from `PRIORITY_OPTIONS`. Editor: 4 options.
- **DateCell.** Display: `formatDateOnly(due)` ("13 พ.ค." or "—"). Editor: native `<input type="date">` + "Clear" button.
- **ProgressCell.** Display: 80 px bar + percent text + delta arrow (▲ green / ▼ red) if `progressUpdatedAt` within last 24 h and `progress !== progressPrev`. Editor: range slider + number input, snap to 5%.
- **TagsCell.** Display: up to 3 tag chips from `TAG_COLORS` + `+N`. Editor: chip input — type to add, backspace to remove, comma/Enter to commit.
- **TextCell** (quarter). Display: text or "—". Editor: `<input>`.

### Cell editor activation rules

- Single click: select cell (highlight border).
- Second click or Enter or F2 or double-click: activate editor.
- For chip cells (status, priority, tags) a single click can open the picker if the cell is already selected.
- All editors close on Esc (revert), Enter (commit), or click outside (commit).

### Sticky header

- `GridHeader` uses `position: sticky; top: 0; z-index: 2; background: var(--surface)`.
- `ProjectGroupRow` is also sticky (`top: 40px`) when its rows are expanded and the user scrolls past — gives a "frozen project header" effect like Excel's "Freeze rows".

### Virtualization plan

- Not in MVP. CSS Grid handles ~300 rows comfortably.
- Trigger to revisit: row count > 300 in any one board OR Lighthouse mainthread > 50 ms on scroll. At that point, integrate `@tanstack/react-virtual` over the rows only (GridHeader and ProjectGroupRows remain in-DOM).

---

## Keyboard navigation spec

Implemented in `useGridKeyboardNav.ts`. Bound at the `Grid` element via `onKeyDown`. Ignored when an editor is active (the editor's own input handles keys).

| Key | Behavior |
|---|---|
| `ArrowUp` / `ArrowDown` | Move selection up/down one row (skip over ProjectGroupRows). |
| `ArrowLeft` / `ArrowRight` | Move selection left/right one column. |
| `Tab` | Same as `ArrowRight`. Wraps to next row at last column. |
| `Shift+Tab` | Same as `ArrowLeft`. Wraps to prev row at first column. |
| `Enter` / `F2` | Activate editor on selected cell. |
| `Escape` | If editor active: cancel + close. Else clear selection. |
| `Space` | If on chip cell: open picker. Else activate editor. |
| `Delete` / `Backspace` (with selection, no editor) | Clear cell (set to null/empty for nullable cells; no-op for required). |
| `Cmd/Ctrl+Z` (future) | Undo. Not in MVP. |

Selection is purely visual + state — actual mutations go through the cell editors and `usePortfolioStore.patchSubProject`.

---

## Zustand stores

Each store is a single file under `src/frontend/store/`. Pattern: `create<State>()((set, get) => ({ ... }))`. Side effects (fetch, optimistic patch) live in the store's actions.

### `useAuthStore.ts`

```ts
interface AuthState {
  status: 'idle' | 'bootstrapping' | 'authed' | 'signing-in' | 'error' | 'guest';
  profile: Profile | null;
  errorMessage: string | null;
  bootstrap(): Promise<void>;          // called from App.tsx on mount
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}
```

- `bootstrap()` reads `supabase.auth.getSession()`, then `GET /api/auth/me`. On `USER_SUSPENDED` → clear + go to login with toast.
- `login()` calls `supabase.auth.signInWithPassword`, then `bootstrap()`.
- `logout()` calls `supabase.auth.signOut()`, clears all stores, routes to `#/login`.

### `useBoardsStore.ts`

```ts
interface BoardsState {
  boards: BoardWithMeta[];
  activeBoardId: string | null;       // persisted to localStorage 'gridwork.activeBoardId.v1'
  setActiveBoard(id: string): void;
  refresh(): Promise<void>;           // GET /api/boards
}
```

### `usePortfolioStore.ts`

```ts
interface PortfolioState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  payload: PortfolioPayload | null;
  errorMessage: string | null;
  load(boardId: string): Promise<void>;       // GET /api/boards/:id/portfolio
  refresh(): Promise<void>;                   // re-fetches current active board (used by ↻ + focus listener)
  patchSubProject(id: string, patch: UpdateSubProjectInput): Promise<void>;
  reorderSubProject(id: string, targetProjectId: string, position: number): Promise<void>;
  createSubProject(input: CreateSubProjectInput): Promise<void>;
  deleteSubProject(id: string): Promise<void>;
  createProject(input: CreateProjectInput): Promise<void>;
  updateProject(id: string, input: UpdateProjectInput): Promise<void>;
  deleteProject(id: string): Promise<void>;
  addSubProjectMember(id: string, userId: string): Promise<void>;
  removeSubProjectMember(id: string, userId: string): Promise<void>;
}
```

**Optimistic patch pattern** (applied in `patchSubProject`):

1. Snapshot the current `payload` for the affected sub-project.
2. Apply the patch to in-memory state immediately (immutable update — `set` replaces the affected project's subProjects array).
3. Call `PUT /api/sub-projects/:id`.
4. On success: replace the optimistic row with the server's canonical `SubProjectWithRelations`.
5. On error: restore the snapshot, push toast with the server's `code` → mapped message.

Same pattern for `reorderSubProject` (snapshot both source and target projects, optimistic splice, server response replaces both projects).

### `useActivitiesStore.ts`

```ts
interface ActivitiesState {
  bySubProjectId: Record<string, Activity[]>;
  status: 'idle' | 'loading' | 'ready' | 'error';
  load(subProjectId: string, from?: string, to?: string): Promise<void>;
  create(input: CreateActivityInput): Promise<void>;
  update(id: string, input: UpdateActivityInput): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### `useGridUIStore.ts`

```ts
interface GridUIState {
  view: 'portfolio' | 'calendar' | 'reports';      // persisted
  expandedProjects: Record<string, boolean>;        // persisted
  selectedCell: { subProjectId: string; columnId: string } | null;
  openPopover: { kind: string; anchorRect: DOMRect } | null;
  columnWidths: Record<string, number>;             // persisted
  setView(v): void;
  toggleProject(projectId: string): void;
  selectCell(c): void;
  openPopover(p): void;
  closePopover(): void;
  setColumnWidth(columnId, width): void;
}
```

Persisted slice keys: `gridwork.gridUI.v1` = `{ view, expandedProjects, columnWidths }`.

### `useToastStore.ts`

```ts
interface ToastState {
  items: { id: string; tone: 'info' | 'success' | 'error'; message: string }[];
  push(t): void;
  dismiss(id: string): void;
}
```

Auto-dismiss after 4 s in `Toast.tsx`.

---

## Design tokens — `src/frontend/styles/tokens.css`

Port the `:root` block from `project-management/project/src/styles.css` lines 1-23 **verbatim**. Frontend-builder writes this file with exactly these contents:

```css
:root {
  --bg: #FAFAF7;
  --surface: #FFFFFF;
  --ink: #1A1916;
  --ink-2: #52575C;
  --ink-3: #8B8F95;
  --line: #ECEBE6;
  --line-2: #E2E0D9;
  --line-3: #D6D3CA;
  --accent: #7C5CFF;
  --accent-2: #FF7849;
  --accent-soft: #EDE7FF;
  --accent-2-soft: #FFEAD8;
  --green: #3DBE8B;
  --red: #E5484D;
  --amber: #F4A300;
  --blue: #3A86FF;
  --shadow-sm: 0 1px 2px rgba(20,18,12,0.04);
  --shadow-md: 0 4px 16px rgba(20,18,12,0.08);
  --shadow-lg: 0 8px 32px rgba(20,18,12,0.12);
  --font-sans: "Plus Jakarta Sans", "IBM Plex Sans Thai", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
}
```

App grid template rows (from prototype): `56px 44px 1fr 40px` (appbar / toolbar / grid host / sheet footer).

Status, priority, role, status (user), and tag colors all already live in `src/types/enums.ts` (`STATUS_OPTIONS`, `PRIORITY_OPTIONS`, `USER_ROLE_META`, `USER_STATUS_META`, `TAG_COLORS`). Cells import from `@/types` and apply `bg`/`fg` directly. Do NOT redefine them in CSS.

---

## CSS module mapping

Map prototype CSS sections to component stylesheets. Frontend-builder copies the relevant rules per file and modernizes (e.g. CSS variables already in place, no SCSS).

| Prototype `styles.css` selectors | Destination file |
|---|---|
| `:root`, body, `.app`, `.appbar`, `.brand`, `.sheet-foot`, generic layout | `app.css` |
| `.toolbar`, `.tab*`, `.view-toggle`, `.refresh-btn` | `app.css` (toolbar block) |
| `.sidebar`, `.ws-*`, `.side-*`, `.proj-*` | `app.css` (sidebar block) — sidebar is optional in MVP; ship if time permits |
| `.grid`, `.grid-header`, `.row`, `.cell`, `.cell-name`, `.cell-num`, `.col-resizer` | `grid.css` |
| `.chip`, `.chip-status`, `.chip-priority`, `.chip-tag`, `.popover`, `.member-picker`, `.avatar-*` | `cells.css` |
| `.calendar*`, `.activity-chip` | `calendar.css` |
| `.reports*`, `.week-*` | `reports.css` |
| `.admin*`, `.users-table`, `.boards-table`, `.modal-*` | `admin.css`, `modal.css` |
| `.login-*`, `.brand-panel`, `.creds-quickfill` | `login.css` |

---

## Refetch-on-focus pattern

In `app/Providers.tsx`:

```ts
// Pseudocode for spec — no implementation here
useEffect(() => {
  let lastFetch = 0;
  const onFocus = () => {
    if (Date.now() - lastFetch < 2000) return;  // debounce
    lastFetch = Date.now();
    usePortfolioStore.getState().refresh();
    // also refresh activities for the open sub-project, if any
  };
  window.addEventListener('focus', onFocus);
  return () => window.removeEventListener('focus', onFocus);
}, []);
```

The manual `↻` button in `Toolbar.tsx` calls the same `refresh()` action.

---

## Optimistic-update rollback pattern

Codified in `usePortfolioStore.patchSubProject`:

1. Capture `before` = the current row.
2. `set` an optimistic projection of `payload` with the patch applied.
3. `await apiClient.put(...)`. The wrapper throws an `ApiClientError({ code, message, status })` on non-2xx or on `{ ok: false }`.
4. On success: `set` with the server response (canonical).
5. On `ApiClientError`:
   - restore `before` into the store.
   - `useToastStore.push({ tone: 'error', message: errorMessages[err.code] ?? err.message })`.
   - if `err.code === 'USER_SUSPENDED'` or `err.code === 'UNAUTHENTICATED'`, additionally call `useAuthStore.logout()`.

Same pattern for `reorderSubProject` and all delete/create flows.

---

## Auth integration (Supabase JS + Express bridge)

`lib/supabaseClient.ts`:

```ts
// imports the URL + anon key from import.meta.env
// exports a single createClient(...) instance, used ONLY for:
//   - supabase.auth.signInWithPassword
//   - supabase.auth.signOut
//   - supabase.auth.getSession (called inside apiClient before every request)
// no .channel(...) calls — realtime is MVP-out (see master § 16)
```

`lib/apiClient.ts`:

```ts
// fetch wrapper, accepts (method, path, body?)
// 1. const session = await supabase.auth.getSession()
// 2. headers: { 'Content-Type': 'application/json', Authorization: session?.access_token ? `Bearer ${...}` : '' }
// 3. const r = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: body && JSON.stringify(body) })
// 4. const json = await r.json() // expects envelope
// 5. if (!r.ok || !json.ok) throw new ApiClientError({ code: json.error?.code ?? 'INTERNAL_ERROR', message: json.error?.message ?? r.statusText, status: r.status })
// 6. return json.data as T
```

`API_BASE_URL` from `import.meta.env.VITE_API_BASE_URL` (default `http://localhost:3001`).

---

## Accessibility notes

- All interactive cells get `role="gridcell"` + `tabIndex` per selection state.
- Grid container: `role="grid"`. Header row: `role="row"` with `aria-rowindex`. Each row: `role="row"`. Each cell: `role="gridcell"` + `aria-colindex`.
- Popovers: `role="dialog"` + `aria-modal="true"` (modal-like — escape closes, focus returns to anchor).
- Buttons that are icon-only carry `aria-label`.
- Toast container: `role="status"` + `aria-live="polite"`.

---

End of frontend spec.
