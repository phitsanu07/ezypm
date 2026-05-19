import type { SubProjectWithRelations } from "@/types";
import { AT_RISK_STALE_DAYS } from "@/types";
import { todayDateOnly } from "@/frontend/lib/dates";

export function isAtRisk(
  sub: SubProjectWithRelations,
  staleDays: number = AT_RISK_STALE_DAYS,
  now: string = todayDateOnly()
): boolean {
  if (sub.status === "go_live") return false;

  if (sub.due && sub.due < now) return true;

  if (sub.updatedAt) {
    const updatedDate = new Date(sub.updatedAt);
    const nowDate = new Date(now + "T00:00:00Z");
    const diffDays =
      (nowDate.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > staleDays) return true;
  }

  return false;
}
