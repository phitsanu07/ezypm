// SDLC status — 6-stage waterfall as shown in the GridWork design
export const SUB_PROJECT_STATUS = {
  REQUIREMENT: "requirement",
  SPEC: "spec",
  DEV: "dev",
  TEST: "test",
  UAT: "uat",
  GO_LIVE: "go_live",
} as const;
export type SubProjectStatus =
  (typeof SUB_PROJECT_STATUS)[keyof typeof SUB_PROJECT_STATUS];

export const SUB_PROJECT_STATUS_VALUES: SubProjectStatus[] = [
  "requirement",
  "spec",
  "dev",
  "test",
  "uat",
  "go_live",
];

export interface StatusOption {
  id: SubProjectStatus;
  label: string;
  labelTh: string;
  dot: string;
  bg: string;
  fg: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { id: "requirement", label: "Requirement", labelTh: "เก็บ requirement", dot: "#9CA0A6", bg: "#EEF0F2", fg: "#52575C" },
  { id: "spec",        label: "Spec",        labelTh: "ออกแบบ spec",      dot: "#3A86FF", bg: "#E4EEFF", fg: "#1A56C5" },
  { id: "dev",         label: "Dev",         labelTh: "พัฒนา",             dot: "#7C5CFF", bg: "#EDE7FF", fg: "#5836CC" },
  { id: "test",        label: "Test",        labelTh: "ทดสอบ (QA)",        dot: "#F4A300", bg: "#FFF1D1", fg: "#8A5A00" },
  { id: "uat",         label: "UAT",         labelTh: "UAT",                dot: "#FF7849", bg: "#FFE9D6", fg: "#9A4400" },
  { id: "go_live",     label: "Go Live",     labelTh: "ขึ้นใช้งานจริง",      dot: "#3DBE8B", bg: "#D7F1E3", fg: "#1F6B45" },
];

// Auto-progress mapping by SDLC status (used by both FE and BE for consistency)
export const STATUS_PROGRESS: Record<SubProjectStatus, number> = {
  requirement: 10,
  spec: 25,
  dev: 50,
  test: 70,
  uat: 85,
  go_live: 100,
};

export const STATUS_ORDER_VAL: Record<SubProjectStatus, number> = {
  requirement: 0,
  spec: 1,
  dev: 2,
  test: 3,
  uat: 4,
  go_live: 5,
};

// Reverse-derive status from a manually edited progress %
export function deriveStatusFromProgress(pct: number): SubProjectStatus {
  if (pct >= 100) return "go_live";
  if (pct >= 80) return "uat";
  if (pct >= 60) return "test";
  if (pct >= 35) return "dev";
  if (pct >= 15) return "spec";
  return "requirement";
}

// ----- Priority -----
export const SUB_PROJECT_PRIORITY = {
  P1: "p1",
  P2: "p2",
  P3: "p3",
  P4: "p4",
} as const;
export type SubProjectPriority =
  (typeof SUB_PROJECT_PRIORITY)[keyof typeof SUB_PROJECT_PRIORITY];

export const SUB_PROJECT_PRIORITY_VALUES: SubProjectPriority[] = ["p1", "p2", "p3", "p4"];

export interface PriorityOption {
  id: SubProjectPriority;
  label: string;
  short: string;
  bg: string;
  fg: string;
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { id: "p1", label: "P1 · Urgent", short: "P1", bg: "#FFE0E1", fg: "#A1262A" },
  { id: "p2", label: "P2 · High",   short: "P2", bg: "#FFEAD1", fg: "#8A5A00" },
  { id: "p3", label: "P3 · Normal", short: "P3", bg: "#E4EEFF", fg: "#1A56C5" },
  { id: "p4", label: "P4 · Low",    short: "P4", bg: "#EEF0F2", fg: "#52575C" },
];

export const PRIORITY_ORDER_VAL: Record<SubProjectPriority, number> = {
  p1: 0,
  p2: 1,
  p3: 2,
  p4: 3,
};

// ----- Project type -----
export const PROJECT_TYPE = {
  YEAR_PLAN: "year_plan",
  AD_HOC: "ad_hoc",
} as const;
export type ProjectType = (typeof PROJECT_TYPE)[keyof typeof PROJECT_TYPE];

export const PROJECT_TYPE_VALUES: ProjectType[] = ["year_plan", "ad_hoc"];

// ----- User roles -----
export const USER_ROLE = {
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const USER_ROLE_VALUES: UserRole[] = ["admin", "editor", "viewer"];

export interface UserRoleMeta {
  id: UserRole;
  label: string;
  labelTh: string;
  color: string;
  bg: string;
  fg: string;
  caps: string;
}

export const USER_ROLE_META: Record<UserRole, UserRoleMeta> = {
  admin:  { id: "admin",  label: "Admin",  labelTh: "ผู้ดูแลระบบ", color: "#7C5CFF", bg: "#EDE7FF", fg: "#5836CC", caps: "All access. Manage users + projects." },
  editor: { id: "editor", label: "Editor", labelTh: "ผู้แก้ไข",     color: "#3A86FF", bg: "#E4EEFF", fg: "#1A56C5", caps: "Create + edit projects and sub-projects." },
  viewer: { id: "viewer", label: "Viewer", labelTh: "ผู้อ่าน",       color: "#9CA0A6", bg: "#EEF0F2", fg: "#52575C", caps: "Read-only access." },
};

// ----- User status -----
export const USER_STATUS = {
  ACTIVE: "active",
  INVITED: "invited",
  SUSPENDED: "suspended",
} as const;
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const USER_STATUS_VALUES: UserStatus[] = ["active", "invited", "suspended"];

export interface UserStatusMeta {
  id: UserStatus;
  label: string;
  labelTh: string;
  color: string;
  bg: string;
  fg: string;
}

export const USER_STATUS_META: Record<UserStatus, UserStatusMeta> = {
  active:    { id: "active",    label: "Active",    labelTh: "ใช้งานอยู่",    color: "#3DBE8B", bg: "#D7F1E3", fg: "#1F6B45" },
  invited:   { id: "invited",   label: "Invited",   labelTh: "ส่งคำเชิญแล้ว", color: "#F4A300", bg: "#FFF1D1", fg: "#8A5A00" },
  suspended: { id: "suspended", label: "Suspended", labelTh: "ระงับ",          color: "#E5484D", bg: "#FFE0E1", fg: "#A1262A" },
};

// ----- Tag palette (open vocabulary, but designer-suggested colors) -----
export interface TagColor {
  bg: string;
  fg: string;
}

export const TAG_COLORS: Record<string, TagColor> = {
  backend:  { bg: "#EDE7FF", fg: "#5836CC" },
  frontend: { bg: "#E0F4FF", fg: "#0A5C90" },
  devops:   { bg: "#FFE9D6", fg: "#9A4400" },
  security: { bg: "#FFE0E1", fg: "#A1262A" },
  payment:  { bg: "#D7F1E3", fg: "#1F6B45" },
  design:   { bg: "#FFE0F0", fg: "#9A1F66" },
  db:       { bg: "#E7F0FF", fg: "#1A56C5" },
  mobile:   { bg: "#EDE7FF", fg: "#5836CC" },
  api:      { bg: "#EDE7FF", fg: "#5836CC" },
  hr:       { bg: "#FFE0F0", fg: "#9A1F66" },
  finance:  { bg: "#D7F1E3", fg: "#1F6B45" },
  infra:    { bg: "#FFE9D6", fg: "#9A4400" },
  q3:       { bg: "#FFF1D1", fg: "#8A5A00" },
};

export const DEFAULT_TAG_COLOR: TagColor = { bg: "#EEF0F2", fg: "#52575C" };

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
