import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { requireAuth } from "@/api/middleware/requireAuth";
import { requireActivityAuthorOrAdmin } from "@/api/middleware/requireActivityAuthorOrAdmin";
import { validate, validateQuery } from "@/api/middleware/validate";
import {
  CreateActivitySchema,
  UpdateActivitySchema,
  ListActivitiesQuerySchema,
} from "@/api/schemas/activity";
import { ApiError } from "@/api/lib/ApiError";
import { mapActivity } from "@/api/lib/mappers";

const router = Router();

/** Resolve board_id for a sub-project and verify caller membership. */
async function resolveSubProjectBoard(
  subId: string,
  userId: string,
): Promise<string> {
  const { data: sub } = await supabaseAdmin
    .from("sub_projects")
    .select("id, project_id")
    .eq("id", subId)
    .maybeSingle();

  if (!sub) {
    throw new ApiError("SUBPROJECT_NOT_FOUND", "Sub-project not found", 404);
  }

  const sr = sub as { id: string; project_id: string };

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("board_id")
    .eq("id", sr.project_id)
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
    throw new ApiError("SUBPROJECT_NOT_FOUND", "Sub-project not found", 404);
  }

  return pr.board_id;
}

/**
 * GET /api/sub-projects/:id/activities
 * List activities for a sub-project, optionally bounded by from/to.
 */
router.get(
  "/sub-projects/:id/activities",
  requireAuth,
  validateQuery(ListActivitiesQuerySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subId = req.params["id"] as string;
      await resolveSubProjectBoard(subId, req.userId);

      const { from, to } = req.validated as {
        from?: string;
        to?: string;
      };

      let query = supabaseAdmin
        .from("activities")
        .select(
          "id, sub_project_id, author_id, type, title, body, occurs_at, created_at, updated_at",
        )
        .eq("sub_project_id", subId)
        .order("occurs_at", { ascending: true });

      if (from) {
        query = query.gte("occurs_at", `${from}T00:00:00.000Z`);
      }
      if (to) {
        query = query.lte("occurs_at", `${to}T23:59:59.999Z`);
      }

      const { data: rows, error } = await query;

      if (error) {
        throw new ApiError("INTERNAL_ERROR", "Failed to load activities", 500);
      }

      const activities = (rows ?? []).map((r) =>
        mapActivity(r as Record<string, unknown>),
      );

      res.status(200).json({ ok: true, data: activities });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/activities
 * Create an activity attached to a sub-project. author_id = current user.
 */
router.post(
  "/activities",
  requireAuth,
  validate(CreateActivitySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.validated as {
        subProjectId: string;
        type: string;
        title: string;
        body?: string | null;
        occursAt: string;
      };

      if (req.profile.role === "viewer") {
        throw new ApiError(
          "FORBIDDEN",
          "Viewers cannot create activities",
          403,
        );
      }

      await resolveSubProjectBoard(body.subProjectId, req.userId);

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("activities")
        .insert({
          sub_project_id: body.subProjectId,
          author_id: req.userId,
          type: body.type,
          title: body.title,
          body: body.body ?? null,
          occurs_at: body.occursAt,
        })
        .select(
          "id, sub_project_id, author_id, type, title, body, occurs_at, created_at, updated_at",
        )
        .single();

      if (insertErr || !inserted) {
        throw new ApiError("INTERNAL_ERROR", "Failed to create activity", 500);
      }

      res
        .status(201)
        .json({
          ok: true,
          data: mapActivity(inserted as Record<string, unknown>),
        });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/activities/:id
 * Edit activity. Author or admin only.
 */
router.put(
  "/activities/:id",
  requireAuth,
  requireActivityAuthorOrAdmin("id"),
  validate(UpdateActivitySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activityId = req.params["id"] as string;

      const body = req.validated as {
        type?: string;
        title?: string;
        body?: string | null;
        occursAt?: string;
      };

      const updatePayload: Record<string, unknown> = {};
      if (body.type !== undefined) updatePayload["type"] = body.type;
      if (body.title !== undefined) updatePayload["title"] = body.title;
      if (body.body !== undefined) updatePayload["body"] = body.body;
      if (body.occursAt !== undefined) updatePayload["occurs_at"] = body.occursAt;

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("activities")
        .update(updatePayload)
        .eq("id", activityId)
        .select(
          "id, sub_project_id, author_id, type, title, body, occurs_at, created_at, updated_at",
        )
        .single();

      if (updateErr || !updated) {
        throw new ApiError("ACTIVITY_NOT_FOUND", "Activity not found", 404);
      }

      res
        .status(200)
        .json({
          ok: true,
          data: mapActivity(updated as Record<string, unknown>),
        });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/activities/:id
 * Delete activity. Author or admin only.
 */
router.delete(
  "/activities/:id",
  requireAuth,
  requireActivityAuthorOrAdmin("id"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activityId = req.params["id"] as string;

      const { error: deleteErr } = await supabaseAdmin
        .from("activities")
        .delete()
        .eq("id", activityId);

      if (deleteErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to delete activity", 500);
      }

      res.status(200).json({ ok: true, data: { id: activityId } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
