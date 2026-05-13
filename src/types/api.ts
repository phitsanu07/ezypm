import type { Project, ProjectWithCounts, Task, TaskWithAssignee, User } from "./domain";
import type { TaskPriority, TaskStatus } from "./enums";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

// ----- Projects -----
export interface CreateProjectInput {
  name: string;
  description?: string | null;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  color?: string;
}

export type ListProjectsResponse = ProjectWithCounts[];
export type GetProjectResponse = Project;
export type CreateProjectResponse = Project;
export type UpdateProjectResponse = Project;

// ----- Tasks -----
export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  position?: number;
}

/** Body for POST /api/projects/:id/tasks/reorder — used by drag-and-drop in GridWork. */
export interface ReorderTasksInput {
  /** Updated ordering. The backend writes `position` in order and may update `status`. */
  updates: Array<{
    id: string;
    status: TaskStatus;
    position: number;
  }>;
}

export type ListTasksResponse = TaskWithAssignee[];
export type GetTaskResponse = TaskWithAssignee;
export type CreateTaskResponse = TaskWithAssignee;
export type UpdateTaskResponse = TaskWithAssignee;
export type ReorderTasksResponse = TaskWithAssignee[];

// ----- Users -----
export type ListUsersResponse = User[];

// ----- Board (the GridWork view payload) -----
export interface BoardColumn {
  status: TaskStatus;
  tasks: TaskWithAssignee[];
}

export interface BoardResponse {
  project: Project;
  columns: BoardColumn[];
  members: User[];
}
