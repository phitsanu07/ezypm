import type {
  Board,
  BoardWithMeta,
  PortfolioPayload,
  Profile,
  Project,
  ProjectWithSubs,
  SubProject,
  SubProjectWithRelations,
} from "./domain";
import type {
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

export interface ApiErr {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;

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
}

export interface UpdateUserInput {
  name?: string;
  nameTh?: string;
  role?: UserRole;
  status?: UserStatus;
  color?: string;
}

export type ListUsersResponse = Profile[];

// ===== AI (Gemini-backed Express endpoints) =====
export interface SummarizeBoardInput {
  boardId: string;
}

export interface SummarizeBoardResponse {
  summary: string;          // Markdown
  highlights: string[];     // top 3 things to focus on
  risks: string[];          // overdue / blocked / stuck
}

export interface SuggestNextStepInput {
  subProjectId: string;
}

export interface SuggestNextStepResponse {
  suggestion: string;
  confidence: "low" | "medium" | "high";
}

// ===== Realtime channel hints (Supabase) =====
export type RealtimeEventKind =
  | "subproject.upsert"
  | "subproject.delete"
  | "project.upsert"
  | "project.delete"
  | "board.upsert";

export interface RealtimeEvent<T = unknown> {
  kind: RealtimeEventKind;
  boardId: string;
  payload: T;
}
