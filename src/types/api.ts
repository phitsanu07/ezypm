import type {
  Activity,
  Board,
  BoardWithMeta,
  PortfolioPayload,
  Profile,
  Project,
  ProjectWithSubs,
  SubProjectWithRelations,
} from "./domain";
import type {
  ActivityType,
  ProjectType,
  SubProjectPriority,
  SubProjectStatus,
  UserRole,
  UserStatus,
} from "./enums";

// ===== Envelope =====
export interface ApiOk<T> {
  ok: true;
  data: T;
}

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

export interface ApiErr {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;

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

// ===== Auth & me =====
export interface MeResponse {
  profile: Profile;
  boards: BoardWithMeta[];
}

// ===== Boards =====
export interface CreateBoardInput {
  name: string;
  nameTh?: string | null;
  icon?: string;
  color?: string;
  memberIds?: string[];
}

export interface UpdateBoardInput {
  name?: string;
  nameTh?: string | null;
  icon?: string;
  color?: string;
}

// MVP-unused; kept for v2 replace-all member endpoint
export interface SetBoardMembersInput {
  memberIds: string[];
}

export type ListBoardsResponse = BoardWithMeta[];
export type GetBoardResponse = BoardWithMeta;
export type GetPortfolioResponse = PortfolioPayload;
export type CreateBoardResponse = Board;
export type UpdateBoardResponse = Board;

// ===== Projects =====
export interface CreateProjectInput {
  boardId: string;
  name: string;
  nameTh?: string | null;
  icon?: string;
  color?: string;
  type?: ProjectType;
}

export interface UpdateProjectInput {
  name?: string;
  nameTh?: string | null;
  icon?: string;
  color?: string;
  type?: ProjectType;
  position?: number;
}

export type CreateProjectResponse = Project;
export type UpdateProjectResponse = Project;
export type GetProjectResponse = ProjectWithSubs;

// ===== Sub-projects =====
export interface CreateSubProjectInput {
  projectId: string;
  name: string;
  nameTh?: string | null;
  icon?: string;
  leadId?: string | null;
  teamIds?: string[];
  status?: SubProjectStatus;
  priority?: SubProjectPriority;
  due?: string | null;
  progress?: number;
  quarter?: string | null;
  tags?: string[];
}

/** Cell-level patch from the grid. All fields optional — only changed cell goes through. */
export interface UpdateSubProjectInput {
  name?: string;
  nameTh?: string | null;
  icon?: string;
  leadId?: string | null;
  teamIds?: string[];
  status?: SubProjectStatus;
  priority?: SubProjectPriority;
  due?: string | null;
  progress?: number;
  quarter?: string | null;
  tags?: string[];
  position?: number;
}

/** Drag-and-drop reorder payload. May move a row to a different project. */
export interface ReorderSubProjectInput {
  targetProjectId: string;
  position: number;
}

export type CreateSubProjectResponse = SubProjectWithRelations;
export type UpdateSubProjectResponse = SubProjectWithRelations;
export type GetSubProjectResponse = SubProjectWithRelations;
export type DeleteResponse = { id: string };

// ===== Profiles / users (admin) =====
export interface InviteUserInput {
  email: string;
  name: string;
  nameTh?: string;
  role: UserRole;
  color?: string;
  password: string;            // admin sets initial password
}

export interface UpdateUserInput {
  name?: string;
  nameTh?: string;
  role?: UserRole;
  status?: UserStatus;
  color?: string;
}

export type ListUsersResponse = Profile[];

// ===== Activities =====
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

// ===== AI (Gemini-backed Express endpoints) =====
// MVP-unused; kept for v2 Gemini integration
export interface SummarizeBoardInput {
  boardId: string;
}

// MVP-unused; kept for v2 Gemini integration
export interface SummarizeBoardResponse {
  summary: string;          // Markdown
  highlights: string[];     // top 3 things to focus on
  risks: string[];          // overdue / blocked / stuck
}

// MVP-unused; kept for v2 Gemini integration
export interface SuggestNextStepInput {
  subProjectId: string;
}

// MVP-unused; kept for v2 Gemini integration
export interface SuggestNextStepResponse {
  suggestion: string;
  confidence: "low" | "medium" | "high";
}

// ===== Realtime channel hints (Supabase) =====
// MVP-unused; kept for v2 realtime subscription
export type RealtimeEventKind =
  | "subproject.upsert"
  | "subproject.delete"
  | "project.upsert"
  | "project.delete"
  | "board.upsert";

// MVP-unused; kept for v2 realtime subscription
export interface RealtimeEvent<T = unknown> {
  kind: RealtimeEventKind;
  boardId: string;
  payload: T;
}
