import type {
  Profile,
  Board,
  BoardWithMeta,
  Project,
  SubProject,
  SubProjectWithRelations,
  ProjectWithSubs,
  Activity,
} from "@/types";

type Row = Record<string, unknown>;

export function mapProfile(row: Row): Profile {
  return {
    id: row["id"] as string,
    email: row["email"] as string,
    name: row["name"] as string,
    nameTh: (row["name_th"] as string) ?? "",
    role: row["role"] as Profile["role"],
    status: row["status"] as Profile["status"],
    color: row["color"] as string,
    initials: row["initials"] as string,
    lastActiveAt: (row["last_active_at"] as string | null) ?? null,
    suspendedAt: (row["suspended_at"] as string | null) ?? null,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

export function mapBoard(row: Row): Board {
  return {
    id: row["id"] as string,
    name: row["name"] as string,
    nameTh: (row["name_th"] as string | null) ?? null,
    icon: row["icon"] as string,
    color: row["color"] as string,
    ownerId: row["owner_id"] as string,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

export function mapBoardWithMeta(
  row: Row,
  members: Profile[],
  projectCount: number,
  subProjectCount: number,
): BoardWithMeta {
  return {
    ...mapBoard(row),
    memberIds: members.map((m) => m.id),
    members,
    projectCount,
    subProjectCount,
  };
}

export function mapProject(row: Row): Project {
  return {
    id: row["id"] as string,
    boardId: row["board_id"] as string,
    name: row["name"] as string,
    nameTh: (row["name_th"] as string | null) ?? null,
    icon: row["icon"] as string,
    color: row["color"] as string,
    type: row["type"] as Project["type"],
    position: row["position"] as number,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

export function mapSubProject(row: Row): SubProject {
  return {
    id: row["id"] as string,
    projectId: row["project_id"] as string,
    name: row["name"] as string,
    nameTh: (row["name_th"] as string | null) ?? null,
    icon: row["icon"] as string,
    leadId: (row["lead_id"] as string | null) ?? null,
    status: row["status"] as SubProject["status"],
    priority: row["priority"] as SubProject["priority"],
    due: (row["due"] as string | null) ?? null,
    progress: row["progress"] as number,
    progressPrev: (row["progress_prev"] as number | null) ?? null,
    progressUpdatedAt: (row["progress_updated_at"] as string | null) ?? null,
    quarter: (row["quarter"] as string | null) ?? null,
    tags: (row["tags"] as string[]) ?? [],
    position: row["position"] as number,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

export function mapSubProjectWithRelations(
  row: Row,
  team: Profile[],
  lead: Profile | null,
): SubProjectWithRelations {
  return {
    ...mapSubProject(row),
    teamIds: team.map((m) => m.id),
    team,
    lead,
  };
}

export function mapProjectWithSubs(
  projectRow: Row,
  subRows: SubProjectWithRelations[],
): ProjectWithSubs {
  return {
    ...mapProject(projectRow),
    subProjects: subRows,
  };
}

export function mapActivity(row: Row): Activity {
  return {
    id: row["id"] as string,
    subProjectId: row["sub_project_id"] as string,
    authorId: (row["author_id"] as string | null) ?? null,
    type: row["type"] as Activity["type"],
    title: row["title"] as string,
    body: (row["body"] as string | null) ?? null,
    occursAt: row["occurs_at"] as string,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

/** Derive initials from a name string (first letter of first two words). */
export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}
