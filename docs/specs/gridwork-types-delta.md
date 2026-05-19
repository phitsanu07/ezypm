# GridWork — Shared Types Delta (Phase 3 implementer's source of truth)

Read [`./gridwork-master.md`](./gridwork-master.md) first.

This file lists every change to `src/types/**` required for Phase 2 builders to compile against a stable contract. **Implementer (Phase 3) applies these changes.** `backend-api` and `frontend-builder` MUST NOT touch `src/types/**` during Phase 2 — they read these planned shapes from this document and import the actual types once Phase 3 lands.

Current state of `src/types/` (already on `main`):

- `src/types/index.ts` — barrel re-export.
- `src/types/domain.ts` — `Profile`, `Board`, `BoardMember`, `BoardWithMeta`, `Project`, `SubProject`, `SubProjectMember`, `SubProjectWithRelations`, `ProjectWithSubs`, `PortfolioPayload`, stats types, `ISODateString`, `ISODateOnly`.
- `src/types/enums.ts` — SDLC status, priority, project type, user role, user status, all `*_OPTIONS`/`*_META` maps, `STATUS_PROGRESS`, `deriveStatusFromProgress`, `TAG_COLORS`.
- `src/types/api.ts` — envelope, `MeResponse`, board/project/sub-project I/O, admin I/O, AI stubs, realtime hints.

Everything below is a diff — additions, modifications, and explicit "leave alone" markers.

---

## 1. `src/types/domain.ts` — additions

### 1a. `AT_RISK_STALE_DAYS` constant

Add at module scope (anywhere appropriate after the type aliases):

```ts
/**
 * A sub-project is "at risk" if either:
 *  - due date is past today AND status !== 'go_live'
 *  - the row has not been updated for this many days AND status !== 'go_live'
 */
export const AT_RISK_STALE_DAYS = 14;
```

### 1b. `SubProject` — two new fields

Existing `SubProject` interface adds:

```ts
// inserted right after `progress: number;`
progressPrev: number | null;            // previous progress value, for delta indicator
progressUpdatedAt: ISODateString | null; // when progress last changed
```

`SubProjectWithRelations` inherits via `extends SubProject` (no change needed there beyond TS picking up the parent fields).

### 1c. `Profile` — clarify `suspended_at`

`Profile.status: UserStatus` already includes `'suspended'` (from `enums.ts`). Add one new optional field:

```ts
// inserted right after `lastActiveAt`:
suspendedAt: ISODateString | null;
```

The DB column is `suspended_at` (`backend-api` snake_cases). The TS field is `suspendedAt`.

---

## 2. `src/types/enums.ts` — additions

### 2a. `ACTIVITY_TYPE` + values + meta

Mirrors the shape of `SUB_PROJECT_STATUS` / `STATUS_OPTIONS`. Append to the end of `enums.ts`:

```ts
// ----- Activity type -----
export const ACTIVITY_TYPE = {
  MEETING: "meeting",
  MILESTONE: "milestone",
  PROGRESS: "progress",
  NOTE: "note",
  BLOCK: "block",
} as const;
export type ActivityType =
  (typeof ACTIVITY_TYPE)[keyof typeof ACTIVITY_TYPE];

export const ACTIVITY_TYPE_VALUES: ActivityType[] = [
  "meeting",
  "milestone",
  "progress",
  "note",
  "block",
];

export interface ActivityTypeMeta {
  id: ActivityType;
  label: string;
  labelTh: string;
  icon: string;      // single-char glyph for chip
  bg: string;        // CSS color hex
  fg: string;
}

export const ACTIVITY_TYPE_META: Record<ActivityType, ActivityTypeMeta> = {
  meeting:   { id: "meeting",   label: "Meeting",   labelTh: "ประชุม",          icon: "👥", bg: "#E4EEFF", fg: "#1A56C5" },
  milestone: { id: "milestone", label: "Milestone", labelTh: "หมุดสำคัญ",        icon: "🏁", bg: "#D7F1E3", fg: "#1F6B45" },
  progress:  { id: "progress",  label: "Progress",  labelTh: "ความคืบหน้า",      icon: "📈", bg: "#EDE7FF", fg: "#5836CC" },
  note:      { id: "note",      label: "Note",      labelTh: "บันทึก",            icon: "📝", bg: "#FFF1D1", fg: "#8A5A00" },
  block:     { id: "block",     label: "Block",     labelTh: "ติดขัด/บล็อก",      icon: "⛔", bg: "#FFE0E1", fg: "#A1262A" },
};
```

Tie-in for backend-api: Zod enum `z.enum(ACTIVITY_TYPE_VALUES as [ActivityType, ...ActivityType[]])`.

---

## 3. `src/types/domain.ts` — `Activity` interface

Append after the existing types (or in a new sub-section):

```ts
import type { ActivityType } from "./enums";

export interface Activity {
  id: string;
  subProjectId: string;
  authorId: string | null;            // null if author was hard-deleted in v2 (MVP: never null because soft-delete)
  type: ActivityType;
  title: string;
  body: string | null;
  occursAt: ISODateString;            // when the activity occurs (calendar timestamp)
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

No `ActivityWithRelations` needed in MVP — author is looked up client-side from `useBoardsStore` / portfolio members. Add only if testing reveals lots of N+1 lookups.

---

## 4. `src/types/api.ts` — additions

### 4a. Login

```ts
// ===== Auth (login) =====
export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  profile: Profile;
}
```

### 4b. Activities I/O

```ts
// ===== Activities =====
import type { Activity } from "./domain";
import type { ActivityType } from "./enums";

export interface CreateActivityInput {
  subProjectId: string;
  type: ActivityType;
  title: string;
  body?: string | null;
  occursAt: string;            // ISODateString
}

export interface UpdateActivityInput {
  type?: ActivityType;
  title?: string;
  body?: string | null;
  occursAt?: string;
}

export interface ListActivitiesQuery {
  from?: string;               // ISODateOnly inclusive
  to?: string;                 // ISODateOnly inclusive
}

export type ListActivitiesResponse = Activity[];
export type CreateActivityResponse = Activity;
export type UpdateActivityResponse = Activity;
```

### 4c. Stable error code union (NEW)

Add a string-literal union for the codes the API may return. Frontend's `errorMessages.ts` keys off this union for exhaustiveness checks:

```ts
export type ApiErrorCode =
  | "Z_VALIDATION"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "PROFILE_MISSING"
  | "USER_SUSPENDED"
  | "FORBIDDEN"
  | "NOT_BOARD_MEMBER"
  | "RLS_DENIED"
  | "BOARD_NOT_FOUND"
  | "PROJECT_NOT_FOUND"
  | "SUBPROJECT_NOT_FOUND"
  | "ACTIVITY_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "TARGET_PROJECT_NOT_FOUND"
  | "NOT_A_MEMBER"
  | "ALREADY_MEMBER"
  | "CANNOT_REMOVE_OWNER"
  | "CANNOT_SUSPEND_SELF"
  | "EMAIL_TAKEN"
  | "BOARDS_DIFFER"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "NETWORK_ERROR";          // client-side only
```

Then tighten the existing `ApiErr` envelope to use it:

```ts
export interface ApiErr {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}
```

This is a soft change — anything passing a stable string still compiles, but the IDE now flags typos.

### 4d. Admin invite — add password

`InviteUserInput` currently has no `password`. Add:

```ts
export interface InviteUserInput {
  email: string;
  name: string;
  nameTh?: string;
  role: UserRole;
  color?: string;
  password: string;            // NEW — admin sets initial password
}
```

---

## 5. Stays the same — annotate as MVP-unused

Annotate these existing types with a TS-doc comment so future readers know they're intentional carryovers, not dead code:

- `SetBoardMembersInput` — comment `/** MVP-unused. Reserved for v2 replace-all member endpoint. */`
- `SummarizeBoardInput`, `SummarizeBoardResponse` — comment `/** MVP-unused. Reserved for v2 Gemini integration. */`
- `SuggestNextStepInput`, `SuggestNextStepResponse` — same.
- `RealtimeEvent`, `RealtimeEventKind` — comment `/** MVP-unused. Reserved for v2 realtime subscription. */`

These types remain importable so any v2 patch can compile without a contract change.

---

## 6. `src/types/index.ts` — re-export hygiene

Ensure the barrel re-exports the new symbols:

```ts
export * from "./domain";    // already re-exports Profile, Board, …; now also AT_RISK_STALE_DAYS, Activity, suspendedAt
export * from "./enums";     // adds ACTIVITY_TYPE, ACTIVITY_TYPE_VALUES, ACTIVITY_TYPE_META, ActivityType, ActivityTypeMeta
export * from "./api";       // adds LoginInput, LoginResponse, CreateActivityInput, …, ApiErrorCode
```

If the existing `index.ts` already uses `export *`, this is a no-op.

---

## 7. What Phase 2 builders may safely import (planned shape, not yet on disk)

backend-api and frontend-builder can write code that **imports these planned types**. The implementer's PR lands first; the builders then merge against it. Both builders should structure their imports so that the contract module is the only thing they take from `@/types`:

- backend-api uses `LoginInput`, `LoginResponse`, `CreateActivityInput`, `ApiErrorCode`, `Activity`, etc. to type request handlers.
- frontend-builder uses the same symbols in `apiClient.ts`, the stores, and the cell editors.
- Both ALSO consume the existing types unchanged: `Profile`, `Board`, `BoardWithMeta`, `PortfolioPayload`, `SubProjectWithRelations`, all `*_OPTIONS`, all `*_META`.

If a builder finds a missing type during Phase 2, they must NOT add it themselves — they raise it to the implementer to land in `src/types/`.

---

## 8. Sequence of Phase 3 work

1. Apply additions to `domain.ts` (1a, 1b, 1c, Activity).
2. Apply additions to `enums.ts` (2a).
3. Apply additions to `api.ts` (4a-4d).
4. Annotate carryover types (5).
5. Verify barrel re-export (6).
6. Run `npm run typecheck && npm run lint` — both must be clean before merging.
7. Notify both builders; rebase.

---

End of types delta.
