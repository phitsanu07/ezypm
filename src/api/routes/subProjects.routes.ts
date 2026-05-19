import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { requireAuth } from "@/api/middleware/requireAuth";
import { validate } from "@/api/middleware/validate";
import {
  CreateSubProjectSchema,
  UpdateSubProjectSchema,
  ReorderSubProjectSchema,
  AddSubProjectMemberSchema,
} from "@/api/schemas/subProject";
import { ApiError } from "@/api/lib/ApiError";
import {
  mapProfile,
  mapSubProjectWithRelations,
  mapProject,
} from "@/api/lib/mappers";
import { STATUS_PROGRESS, deriveStatusFromProgress } from "@/types";
import type {
  SubProjectWithRelations,
  Profile,
  ProjectWithSubs,
} from "@/types";

const router = Router();

/** Load a sub-project row and verify caller has board membership + editor/admin role. */
async function loadSubAndVerify(
  subId: string,
  userId: string,
  role: string,
): Promise<Record<string, unknown>> {
  const { data: sub, error } = await supabaseAdmin
    .from("sub_projects")
    .select(
      "id, project_id, name, name_th, icon, lead_id, status, priority, due, progress, progress_prev, progress_updated_at, quarter, tags, position, created_at, updated_at",
    )
    .eq("id", subId)
    .maybeSingle();

  if (error || !sub) {
    throw new ApiError("SUBPROJECT_NOT_FOUND", "Sub-project not found", 404);
  }

  const sr = sub as Record<string, unknown>;

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("board_id")
    .eq("id", sr["project_id"] as string)
    .single();

  if (!project) {
    throw new ApiError("PROJECT_NOT_FOUND", "Project not found", 404);
  }

  const pr = project as { board_id: string };

  // Service-role bypasses RLS — enforce membership manually
  const { data: membership } = await supabaseAdmin
    .from("board_members")
    .select("board_id")
    .eq("board_id", pr.board_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    throw new ApiError("FORBIDDEN", "Not a member of this board", 403);
  }

  if (role === "viewer") {
    throw new ApiError(
      "FORBIDDEN",
      "Viewers cannot modify sub-projects",
      403,
    );
  }

  return sr;
}

/** Hydrate a sub-project row with team and lead relations. */
async function hydrateSubProject(
  sr: Record<string, unknown>,
): Promise<SubProjectWithRelations> {
  const subId = sr["id"] as string;

  const { data: teamRows } = await supabaseAdmin
    .from("sub_project_members")
    .select(
      "profiles(id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at)",
    )
    .eq("sub_project_id", subId);

  const team: Profile[] = (teamRows ?? [])
    .map((r: Record<string, unknown>) => {
      const p = r["profiles"] as Record<string, unknown> | null;
      return p ? mapProfile(p) : null;
    })
    .filter((p): p is Profile => p !== null);

  let lead: Profile | null = null;
  const leadId = sr["lead_id"] as string | null;
  if (leadId) {
    const { data: leadRow } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at",
      )
      .eq("id", leadId)
      .single();
    if (leadRow) {
      lead = mapProfile(leadRow as Record<string, unknown>);
    }
  }

  return mapSubProjectWithRelations(sr, team, lead);
}

/** Load all sub-projects for a project, with relations. */
async function loadProjectWithSubs(projectId: string): Promise<ProjectWithSubs> {
  const { data: projectRow } = await supabaseAdmin
    .from("projects")
    .select(
      "id, board_id, name, name_th, icon, color, type, position, created_at, updated_at",
    )
    .eq("id", projectId)
    .single();

  if (!projectRow) {
    throw new ApiError("PROJECT_NOT_FOUND", "Project not found", 404);
  }

  const { data: subRows } = await supabaseAdmin
    .from("sub_projects")
    .select(
      "id, project_id, name, name_th, icon, lead_id, status, priority, due, progress, progress_prev, progress_updated_at, quarter, tags, position, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  const subs = await Promise.all(
    (subRows ?? []).map((r) => hydrateSubProject(r as Record<string, unknown>)),
  );

  return {
    ...mapProject(projectRow as Record<string, unknown>),
    subProjects: subs,
  };
}

/**
 * POST /api/sub-projects
 * Create a sub-project. Auto-position to max(position) + 100.
 */
router.post(
  "/",
  requireAuth,
  validate(CreateSubProjectSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.validated as {
        projectId: string;
        name: string;
        nameTh?: string | null;
        icon?: string;
        leadId?: string | null;
        teamIds?: string[];
        status?: string;
        priority?: string;
        due?: string | null;
        progress?: number;
        quarter?: string | null;
        tags?: string[];
      };

      if (req.profile.role === "viewer") {
        throw new ApiError(
          "FORBIDDEN",
          "Viewers cannot create sub-projects",
          403,
        );
      }

      const { data: project } = await supabaseAdmin
        .from("projects")
        .select("id, board_id")
        .eq("id", body.projectId)
        .maybeSingle();

      if (!project) {
        throw new ApiError("PROJECT_NOT_FOUND", "Project not found", 404);
      }

      const pr = project as { id: string; board_id: string };

      // Service-role bypasses RLS — enforce membership manually
      const { data: membership } = await supabaseAdmin
        .from("board_members")
        .select("board_id")
        .eq("board_id", pr.board_id)
        .eq("user_id", req.userId)
        .maybeSingle();

      if (!membership) {
        throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
      }

      const { data: maxRow } = await supabaseAdmin
        .from("sub_projects")
        .select("position")
        .eq("project_id", body.projectId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const position =
        (((maxRow as Record<string, unknown> | null)?.["position"] as
          | number
          | undefined) ?? 0) + 100;

      const status = (body.status ?? "requirement") as keyof typeof STATUS_PROGRESS;
      const progress = body.progress ?? STATUS_PROGRESS[status];

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("sub_projects")
        .insert({
          project_id: body.projectId,
          name: body.name,
          name_th: body.nameTh ?? null,
          icon: body.icon ?? "◇",
          lead_id: body.leadId ?? null,
          status,
          priority: body.priority ?? "p3",
          due: body.due ?? null,
          progress,
          quarter: body.quarter ?? null,
          tags: body.tags ?? [],
          position,
        })
        .select(
          "id, project_id, name, name_th, icon, lead_id, status, priority, due, progress, progress_prev, progress_updated_at, quarter, tags, position, created_at, updated_at",
        )
        .single();

      if (insertErr || !inserted) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Failed to create sub-project",
          500,
        );
      }

      const sr = inserted as Record<string, unknown>;

      if (body.teamIds && body.teamIds.length > 0) {
        await supabaseAdmin.from("sub_project_members").insert(
          body.teamIds.map((uid) => ({
            sub_project_id: sr["id"] as string,
            user_id: uid,
          })),
        );
      }

      const hydrated = await hydrateSubProject(sr);
      res.status(201).json({ ok: true, data: hydrated });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/sub-projects/:id
 * Patch one or more fields. Auto-progress logic applied server-side.
 */
router.put(
  "/:id",
  requireAuth,
  validate(UpdateSubProjectSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subId = req.params["id"] as string;
      const sr = await loadSubAndVerify(subId, req.userId, req.profile.role);

      const body = req.validated as {
        name?: string;
        nameTh?: string | null;
        icon?: string;
        leadId?: string | null;
        teamIds?: string[];
        status?: string;
        priority?: string;
        due?: string | null;
        progress?: number;
        quarter?: string | null;
        tags?: string[];
        position?: number;
      };

      const patchStatus = body.status as keyof typeof STATUS_PROGRESS | undefined;
      const patchProgress = body.progress;
      const currentProgress = sr["progress"] as number;

      const updatePayload: Record<string, unknown> = {};

      if (body.name !== undefined) updatePayload["name"] = body.name;
      if (body.nameTh !== undefined) updatePayload["name_th"] = body.nameTh;
      if (body.icon !== undefined) updatePayload["icon"] = body.icon;
      if (body.leadId !== undefined) updatePayload["lead_id"] = body.leadId;
      if (body.priority !== undefined) updatePayload["priority"] = body.priority;
      if (body.due !== undefined) updatePayload["due"] = body.due;
      if (body.quarter !== undefined) updatePayload["quarter"] = body.quarter;
      if (body.tags !== undefined) updatePayload["tags"] = body.tags;
      if (body.position !== undefined) updatePayload["position"] = body.position;

      // Auto-progress logic: status-only patch → derive progress
      if (patchStatus !== undefined && patchProgress === undefined) {
        updatePayload["status"] = patchStatus;
        updatePayload["progress"] = STATUS_PROGRESS[patchStatus];
        updatePayload["progress_prev"] = currentProgress;
        updatePayload["progress_updated_at"] = new Date().toISOString();
      } else if (patchProgress !== undefined && patchStatus === undefined) {
        // progress-only patch → derive status
        updatePayload["progress"] = patchProgress;
        updatePayload["status"] = deriveStatusFromProgress(patchProgress);
        updatePayload["progress_prev"] = currentProgress;
        updatePayload["progress_updated_at"] = new Date().toISOString();
      } else if (patchStatus !== undefined && patchProgress !== undefined) {
        // both provided → trust caller
        updatePayload["status"] = patchStatus;
        updatePayload["progress"] = patchProgress;
        updatePayload["progress_prev"] = currentProgress;
        updatePayload["progress_updated_at"] = new Date().toISOString();
      }

      // Only run sub_projects UPDATE if there are columns to change.
      // teamIds-only patches don't touch sub_projects (members table is separate).
      let updatedSr: Record<string, unknown>;
      if (Object.keys(updatePayload).length > 0) {
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from("sub_projects")
          .update(updatePayload)
          .eq("id", subId)
          .select(
            "id, project_id, name, name_th, icon, lead_id, status, priority, due, progress, progress_prev, progress_updated_at, quarter, tags, position, created_at, updated_at",
          )
          .single();

        if (updateErr || !updated) {
          console.error("[sub-project PUT] update failed:", {
            subId,
            payload: updatePayload,
            error: updateErr,
          });
          throw new ApiError(
            "INTERNAL_ERROR",
            `Failed to update sub-project: ${updateErr?.message ?? "unknown"}`,
            500,
          );
        }
        updatedSr = updated as Record<string, unknown>;
      } else {
        updatedSr = sr;
      }

      if (body.teamIds !== undefined) {
        const { error: delErr } = await supabaseAdmin
          .from("sub_project_members")
          .delete()
          .eq("sub_project_id", subId);

        if (delErr) {
          console.error("[sub-project PUT] team delete failed:", delErr);
          throw new ApiError(
            "INTERNAL_ERROR",
            `Failed to clear team: ${delErr.message}`,
            500,
          );
        }

        if (body.teamIds.length > 0) {
          const { error: insErr } = await supabaseAdmin
            .from("sub_project_members")
            .insert(
              body.teamIds.map((uid) => ({
                sub_project_id: subId,
                user_id: uid,
              })),
            );

          if (insErr) {
            console.error("[sub-project PUT] team insert failed:", {
              teamIds: body.teamIds,
              error: insErr,
            });
            throw new ApiError(
              "INTERNAL_ERROR",
              `Failed to add team members: ${insErr.message}`,
              500,
            );
          }
        }
      }

      const hydrated = await hydrateSubProject(updatedSr);
      res.status(200).json({ ok: true, data: hydrated });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/sub-projects/:id/reorder
 * Move row to a target project + position.
 * Uses gap-100 strategy. On collision (gap < 2), renumbers that whole project's
 * sub_projects atomically to 100, 200, 300, … then places the moved row.
 */
router.put(
  "/:id/reorder",
  requireAuth,
  validate(ReorderSubProjectSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subId = req.params["id"] as string;

      const { data: sub, error: subErr } = await supabaseAdmin
        .from("sub_projects")
        .select("id, project_id, position")
        .eq("id", subId)
        .maybeSingle();

      if (subErr || !sub) {
        throw new ApiError("SUBPROJECT_NOT_FOUND", "Sub-project not found", 404);
      }

      const subRow = sub as { id: string; project_id: string; position: number };

      if (req.profile.role === "viewer") {
        throw new ApiError("FORBIDDEN", "Viewers cannot reorder sub-projects", 403);
      }

      const { data: sourceProject } = await supabaseAdmin
        .from("projects")
        .select("id, board_id")
        .eq("id", subRow.project_id)
        .single();

      if (!sourceProject) {
        throw new ApiError("PROJECT_NOT_FOUND", "Source project not found", 404);
      }

      const srcPr = sourceProject as { id: string; board_id: string };

      // Enforce board membership
      const { data: membership } = await supabaseAdmin
        .from("board_members")
        .select("board_id")
        .eq("board_id", srcPr.board_id)
        .eq("user_id", req.userId)
        .maybeSingle();

      if (!membership) {
        throw new ApiError("FORBIDDEN", "Not a member of this board", 403);
      }

      const body = req.validated as {
        targetProjectId: string;
        position: number;
      };

      const { data: targetProject } = await supabaseAdmin
        .from("projects")
        .select("id, board_id")
        .eq("id", body.targetProjectId)
        .maybeSingle();

      if (!targetProject) {
        throw new ApiError(
          "TARGET_PROJECT_NOT_FOUND",
          "Target project not found",
          404,
        );
      }

      const tgtPr = targetProject as { id: string; board_id: string };

      // Cross-board reorder is rejected
      if (tgtPr.board_id !== srcPr.board_id) {
        throw new ApiError(
          "BOARDS_DIFFER",
          "Cannot move sub-project to a different board",
          422,
        );
      }

      // Load all rows of the target project sorted by position to find neighbours
      const { data: targetSubs } = await supabaseAdmin
        .from("sub_projects")
        .select("id, position")
        .eq("project_id", body.targetProjectId)
        .neq("id", subId)
        .order("position", { ascending: true });

      const orderedSubs = (targetSubs ?? []) as Array<{
        id: string;
        position: number;
      }>;

      // Find the insertion slot based on the requested position value
      const insertIndex = orderedSubs.findIndex(
        (r) => r.position >= body.position,
      );

      const prevPos =
        insertIndex > 0
          ? (orderedSubs[insertIndex - 1]?.position ?? 0)
          : insertIndex === 0
            ? 0
            : (orderedSubs[orderedSubs.length - 1]?.position ?? 0);

      const nextPos =
        insertIndex >= 0 && insertIndex < orderedSubs.length
          ? (orderedSubs[insertIndex]?.position ?? prevPos + 200)
          : prevPos + 200;

      let newPosition: number;
      const midpoint = Math.floor((prevPos + nextPos) / 2);

      // Gap-100 collision: if mid would be within 1 of a neighbour, renumber the segment
      if (midpoint - prevPos < 2 || nextPos - midpoint < 2) {
        // Renumber all rows of the target project (excluding moved row) + place inserted row
        const allTargetSubs = [...orderedSubs];
        const insertAt =
          insertIndex >= 0 ? insertIndex : allTargetSubs.length;

        const renumbered = [
          ...allTargetSubs.slice(0, insertAt),
          { id: subId, position: 0 },
          ...allTargetSubs.slice(insertAt),
        ];

        for (let i = 0; i < renumbered.length; i++) {
          const entry = renumbered[i];
          if (!entry) continue;
          const pos = (i + 1) * 100;
          await supabaseAdmin
            .from("sub_projects")
            .update({ position: pos, project_id: body.targetProjectId })
            .eq("id", entry.id);
        }

        newPosition = (insertAt + 1) * 100;
      } else {
        newPosition = midpoint;
        await supabaseAdmin
          .from("sub_projects")
          .update({ position: newPosition, project_id: body.targetProjectId })
          .eq("id", subId);
      }

      // Return the fresh state of source and target projects
      const sourceResult = await loadProjectWithSubs(subRow.project_id);
      const targetResult =
        body.targetProjectId === subRow.project_id
          ? sourceResult
          : await loadProjectWithSubs(body.targetProjectId);

      const responseData: ProjectWithSubs[] =
        body.targetProjectId === subRow.project_id
          ? [sourceResult]
          : [sourceResult, targetResult];

      res.status(200).json({ ok: true, data: responseData });
      return;
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/sub-projects/:id
 * Hard delete. Cascades to sub_project_members and activities.
 */
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subId = req.params["id"] as string;
      await loadSubAndVerify(subId, req.userId, req.profile.role);

      const { error: deleteErr } = await supabaseAdmin
        .from("sub_projects")
        .delete()
        .eq("id", subId);

      if (deleteErr) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Failed to delete sub-project",
          500,
        );
      }

      res.status(200).json({ ok: true, data: { id: subId } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/sub-projects/:id/members
 * Add team member (Team column).
 */
router.post(
  "/:id/members",
  requireAuth,
  validate(AddSubProjectMemberSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subId = req.params["id"] as string;
      const sr = await loadSubAndVerify(subId, req.userId, req.profile.role);

      const { userId } = req.validated as { userId: string };

      const { data: userExists } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!userExists) {
        throw new ApiError("USER_NOT_FOUND", "User not found", 404);
      }

      const { data: existing } = await supabaseAdmin
        .from("sub_project_members")
        .select("sub_project_id")
        .eq("sub_project_id", subId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        throw new ApiError("ALREADY_MEMBER", "User is already a team member", 409);
      }

      const { error: insertErr } = await supabaseAdmin
        .from("sub_project_members")
        .insert({ sub_project_id: subId, user_id: userId });

      if (insertErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to add team member", 500);
      }

      const updatedSr = { ...sr };
      const hydrated = await hydrateSubProject(updatedSr);
      res.status(200).json({ ok: true, data: hydrated });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/sub-projects/:id/members/:userId
 * Remove a team member.
 */
router.delete(
  "/:id/members/:userId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subId = req.params["id"] as string;
      const userId = req.params["userId"] as string;
      await loadSubAndVerify(subId, req.userId, req.profile.role);

      const { data: existing } = await supabaseAdmin
        .from("sub_project_members")
        .select("sub_project_id")
        .eq("sub_project_id", subId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existing) {
        throw new ApiError("NOT_A_MEMBER", "User is not a team member", 404);
      }

      const { error: deleteErr } = await supabaseAdmin
        .from("sub_project_members")
        .delete()
        .eq("sub_project_id", subId)
        .eq("user_id", userId);

      if (deleteErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to remove team member", 500);
      }

      res.status(200).json({ ok: true, data: { id: userId } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
