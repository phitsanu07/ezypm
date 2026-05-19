import type {
  ActivityType,
  ProjectType,
  SubProjectPriority,
  SubProjectStatus,
  UserRole,
  UserStatus,
} from "./enums";

export type ISODateString = string;     // "2026-05-13T09:12:00.000Z"
export type ISODateOnly = string;       // "2026-06-20"

// A sub-project is "at risk" if overdue OR not updated for this many days AND status !== 'go_live'
export const AT_RISK_STALE_DAYS = 14;

// ===== Profile (mapped 1-1 to Supabase auth.users via id) =====
export interface Profile {
  id: string;                // = auth.users.id (uuid)
  email: string;
  name: string;
  nameTh: string;
  role: UserRole;
  status: UserStatus;
  color: string;             // hex, e.g. "#7C5CFF"
  initials: string;          // "AS"
  lastActiveAt: ISODateString | null;
  suspendedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ===== Board (workspace) =====
export interface Board {
  id: string;
  name: string;
  nameTh: string | null;
  icon: string;              // single char like "▦"
  color: string;             // hex
  ownerId: string;           // profiles.id
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Junction: board_members
export interface BoardMember {
  boardId: string;
  userId: string;
  addedAt: ISODateString;
}

// Board enriched with the current user's view: members + counts
export interface BoardWithMeta extends Board {
  memberIds: string[];
  members: Profile[];
  projectCount: number;
  subProjectCount: number;
}

// ===== Project (group within a board) =====
export interface Project {
  id: string;
  boardId: string;
  name: string;
  nameTh: string | null;
  icon: string;
  color: string;
  type: ProjectType;
  position: number;          // ordering within a board
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ===== Sub-project (the ROW in GridWork) =====
export interface SubProject {
  id: string;
  projectId: string;
  name: string;
  nameTh: string | null;
  icon: string;
  leadId: string | null;     // profiles.id
  status: SubProjectStatus;
  priority: SubProjectPriority;
  due: ISODateOnly | null;   // "YYYY-MM-DD"
  progress: number;          // 0..100
  progressPrev: number | null;             // previous progress value, for delta indicator
  progressUpdatedAt: ISODateString | null; // when progress last changed
  quarter: string | null;    // e.g. "Q2-26"
  tags: string[];            // open vocab; lookups via TAG_COLORS
  position: number;          // ordering within a project
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Junction: sub_project_members (the C column = "Team")
export interface SubProjectMember {
  subProjectId: string;
  userId: string;
  addedAt: ISODateString;
}

// Enriched for the grid view (single network payload powering the table)
export interface SubProjectWithRelations extends SubProject {
  teamIds: string[];
  team: Profile[];           // hydrated members
  lead: Profile | null;
}

export interface ProjectWithSubs extends Project {
  subProjects: SubProjectWithRelations[];
}

/** The full payload powering the GridWork view for one board. */
export interface PortfolioPayload {
  board: Board;
  members: Profile[];        // members of THIS board (for assignee popovers)
  projects: ProjectWithSubs[];
}

// ===== Stats (used in footer + project group headers) =====
export interface PortfolioStats {
  subProjectCount: number;
  shippedCount: number;       // status === "go_live"
  atRiskCount: number;        // overdue OR status stuck
  avgProgress: number;        // 0..100
}

export interface ProjectStats {
  subCount: number;
  shippedCount: number;
  atRiskCount: number;
  avgProgress: number;
}

// ===== Activity (timeline entry on a sub-project) =====
export interface Activity {
  id: string;
  subProjectId: string;
  authorId: string | null;             // null if author was hard-deleted in v2 (MVP: never null because soft-delete)
  type: ActivityType;
  title: string;
  body: string | null;
  occursAt: ISODateString;             // when the activity occurs (calendar timestamp)
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
