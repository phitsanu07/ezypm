import type { TaskPriority, TaskStatus } from "./enums";

export type ISODateString = string;

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: ISODateString;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  assigneeId: string | null;
  dueDate: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface TaskWithAssignee extends Task {
  assignee: User | null;
}

export interface ProjectWithCounts extends Project {
  taskCount: number;
  doneCount: number;
}
