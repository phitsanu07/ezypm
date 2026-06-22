import type { ProjectWithSubs } from "@/types";

export type TagFilter = "all" | "year_plan" | "ad_hoc";
export type StatusFilter = "all" | "completed" | "on_dev";

/** Average sub-project progress (0–100). Empty projects count as 0. */
export function projectAvgProgress(project: ProjectWithSubs): number {
  const subs = project.subProjects;
  if (subs.length === 0) return 0;
  return Math.round(subs.reduce((a, s) => a + s.progress, 0) / subs.length);
}

/** A project is "completed" when it has sub-projects and they all average 100%. */
export function isProjectComplete(project: ProjectWithSubs): boolean {
  return project.subProjects.length > 0 && projectAvgProgress(project) === 100;
}

export function filterProjects(
  projects: ProjectWithSubs[],
  tag: TagFilter,
  status: StatusFilter,
): ProjectWithSubs[] {
  return projects.filter((p) => {
    if (tag !== "all" && p.type !== tag) return false;
    if (status === "completed" && !isProjectComplete(p)) return false;
    if (status === "on_dev" && isProjectComplete(p)) return false;
    return true;
  });
}
