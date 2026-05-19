import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { requireAuth } from "@/api/middleware/requireAuth";
import { requireBoardMember } from "@/api/middleware/requireBoardMember";
import { validate } from "@/api/middleware/validate";
import { CreateProjectSchema, UpdateProjectSchema } from "@/api/schemas/project";
import { ApiError } from "@/api/lib/ApiError";
import { mapProject } from "@/api/lib/mappers";

const router = Router();

/**
 * POST /api/projects
 * Create a project inside a board. Editor/admin only.
 */
router.post(
  "/",
  requireAuth,
  validate(CreateProjectSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.validated as {
        boardId: string;
        name: string;
        nameTh?: string | null;
        icon?: string;
        color?: string;
        type?: string;
      };

      if (req.profile.role === "viewer") {
        throw new ApiError(
          "FORBIDDEN",
          "Viewers cannot create projects",
          403,
        );
      }

      // Verify board membership (boardId comes from body, not URL param)
      const { data: membership } = await supabaseAdmin
        .from("board_members")
        .select("board_id")
        .eq("board_id", body.boardId)
        .eq("user_id", req.userId)
        .maybeSingle();

      if (!membership) {
        throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
      }

      // Compute next position (gap-100)
      const { data: maxRow } = await supabaseAdmin
        .from("projects")
        .select("position")
        .eq("board_id", body.boardId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition =
        ((maxRow as Record<string, unknown> | null)?.["position"] as
          | number
          | undefined) ?? 0;
      const position = nextPosition + 100;

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("projects")
        .insert({
          board_id: body.boardId,
          name: body.name,
          name_th: body.nameTh ?? null,
          icon: body.icon ?? "◇",
          color: body.color ?? "#7C5CFF",
          type: body.type ?? "ad_hoc",
          position,
        })
        .select(
          "id, board_id, name, name_th, icon, color, type, position, created_at, updated_at",
        )
        .single();

      if (insertErr || !inserted) {
        throw new ApiError("INTERNAL_ERROR", "Failed to create project", 500);
      }

      res
        .status(201)
        .json({
          ok: true,
          data: mapProject(inserted as Record<string, unknown>),
        });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/projects/:id
 * Update project fields. Editor/admin only.
 */
router.put(
  "/:id",
  requireAuth,
  validate(UpdateProjectSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.params["id"] as string;

      const { data: project, error: fetchErr } = await supabaseAdmin
        .from("projects")
        .select("id, board_id")
        .eq("id", projectId)
        .maybeSingle();

      if (fetchErr || !project) {
        throw new ApiError("PROJECT_NOT_FOUND", "Project not found", 404);
      }

      const pr = project as { id: string; board_id: string };

      if (req.profile.role === "viewer") {
        throw new ApiError("FORBIDDEN", "Viewers cannot update projects", 403);
      }

      // Service-role bypasses RLS — enforce membership here
      await requireBoardMember("boardId")(
        Object.assign(req, { params: { boardId: pr.board_id } }),
        res as Response,
        (err?: unknown) => {
          if (err) throw err;
        },
      );

      const body = req.validated as Record<string, unknown>;
      const updatePayload: Record<string, unknown> = {};
      if (body["name"] !== undefined) updatePayload["name"] = body["name"];
      if (body["nameTh"] !== undefined) updatePayload["name_th"] = body["nameTh"];
      if (body["icon"] !== undefined) updatePayload["icon"] = body["icon"];
      if (body["color"] !== undefined) updatePayload["color"] = body["color"];
      if (body["type"] !== undefined) updatePayload["type"] = body["type"];
      if (body["position"] !== undefined) updatePayload["position"] = body["position"];

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("projects")
        .update(updatePayload)
        .eq("id", projectId)
        .select(
          "id, board_id, name, name_th, icon, color, type, position, created_at, updated_at",
        )
        .single();

      if (updateErr || !updated) {
        throw new ApiError("INTERNAL_ERROR", "Failed to update project", 500);
      }

      res
        .status(200)
        .json({
          ok: true,
          data: mapProject(updated as Record<string, unknown>),
        });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/projects/:id
 * Hard delete — cascades to sub_projects.
 */
router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.params["id"] as string;

      const { data: project, error: fetchErr } = await supabaseAdmin
        .from("projects")
        .select("id, board_id")
        .eq("id", projectId)
        .maybeSingle();

      if (fetchErr || !project) {
        throw new ApiError("PROJECT_NOT_FOUND", "Project not found", 404);
      }

      const pr = project as { id: string; board_id: string };

      if (req.profile.role === "viewer") {
        throw new ApiError("FORBIDDEN", "Viewers cannot delete projects", 403);
      }

      const { data: membership } = await supabaseAdmin
        .from("board_members")
        .select("board_id")
        .eq("board_id", pr.board_id)
        .eq("user_id", req.userId)
        .maybeSingle();

      if (!membership) {
        throw new ApiError("FORBIDDEN", "Not a member of this board", 403);
      }

      const { error: deleteErr } = await supabaseAdmin
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (deleteErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to delete project", 500);
      }

      res.status(200).json({ ok: true, data: { id: projectId } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
