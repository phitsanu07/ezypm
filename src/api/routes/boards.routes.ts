import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { requireAuth } from "@/api/middleware/requireAuth";
import { requireBoardMember } from "@/api/middleware/requireBoardMember";
import { requireBoardAdmin } from "@/api/middleware/requireBoardAdmin";
import { validate } from "@/api/middleware/validate";
import { AddBoardMemberSchema } from "@/api/schemas/board";
import { ApiError } from "@/api/lib/ApiError";
import {
  mapProfile,
  mapBoard,
  mapSubProjectWithRelations,
  mapProjectWithSubs,
} from "@/api/lib/mappers";
import type {
  BoardWithMeta,
  PortfolioPayload,
  Profile,
  ProjectWithSubs,
} from "@/types";

const router = Router();

/** Build a BoardWithMeta for a given boardId. */
async function buildBoardWithMeta(boardId: string): Promise<BoardWithMeta> {
  const { data: boardRow, error: boardErr } = await supabaseAdmin
    .from("boards")
    .select("id, name, name_th, icon, color, owner_id, created_at, updated_at")
    .eq("id", boardId)
    .single();

  if (boardErr || !boardRow) {
    throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
  }

  const { data: membersRows, error: membersErr } = await supabaseAdmin
    .from("board_members")
    .select(
      "profiles(id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at)",
    )
    .eq("board_id", boardId);

  if (membersErr) {
    throw new ApiError("INTERNAL_ERROR", "Failed to load board members", 500);
  }

  const members: Profile[] = (membersRows ?? [])
    .map((r: Record<string, unknown>) => {
      const p = r["profiles"] as Record<string, unknown> | null;
      return p ? mapProfile(p) : null;
    })
    .filter((p): p is Profile => p !== null);

  const { count: projectCount } = await supabaseAdmin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("board_id", boardId);

  const { data: projectIds } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("board_id", boardId);

  const pIds = (projectIds ?? []).map(
    (r: Record<string, unknown>) => r["id"] as string,
  );

  let subProjectCount = 0;
  if (pIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("sub_projects")
      .select("id", { count: "exact", head: true })
      .in("project_id", pIds);
    subProjectCount = count ?? 0;
  }

  const board = mapBoard(boardRow as Record<string, unknown>);
  return {
    ...board,
    memberIds: members.map((m) => m.id),
    members,
    projectCount: projectCount ?? 0,
    subProjectCount,
  };
}

/**
 * GET /api/boards
 * List boards the current user is a member of.
 */
router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { data: memberRows, error: memberErr } = await supabaseAdmin
        .from("board_members")
        .select("board_id")
        .eq("user_id", req.userId);

      if (memberErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to load boards", 500);
      }

      const boardIds = (memberRows ?? []).map(
        (r: Record<string, unknown>) => r["board_id"] as string,
      );

      const boards = await Promise.all(boardIds.map(buildBoardWithMeta));
      res.status(200).json({ ok: true, data: boards });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/boards/:id
 * One board with member list and counts.
 */
router.get(
  "/:id",
  requireAuth,
  requireBoardMember("id"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const board = await buildBoardWithMeta(req.params["id"] as string);
      res.status(200).json({ ok: true, data: board });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/boards/:id/portfolio
 * Full portfolio payload: board + members + projects + sub-projects with relations.
 * Portfolio payload is built in TypeScript (no DB view required) for flexibility.
 */
router.get(
  "/:id/portfolio",
  requireAuth,
  requireBoardMember("id"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params["id"] as string;

      const { data: boardRow, error: boardErr } = await supabaseAdmin
        .from("boards")
        .select("id, name, name_th, icon, color, owner_id, created_at, updated_at")
        .eq("id", boardId)
        .single();

      if (boardErr || !boardRow) {
        throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
      }

      const { data: membersRows } = await supabaseAdmin
        .from("board_members")
        .select(
          "profiles(id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at)",
        )
        .eq("board_id", boardId);

      const boardMembers: Profile[] = (membersRows ?? [])
        .map((r: Record<string, unknown>) => {
          const p = r["profiles"] as Record<string, unknown> | null;
          return p ? mapProfile(p) : null;
        })
        .filter((p): p is Profile => p !== null);

      const { data: projectRows, error: projectErr } = await supabaseAdmin
        .from("projects")
        .select(
          "id, board_id, name, name_th, icon, color, type, position, created_at, updated_at",
        )
        .eq("board_id", boardId)
        .order("position", { ascending: true });

      if (projectErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to load projects", 500);
      }

      const projectList = (projectRows ?? []) as Record<string, unknown>[];
      const projectIds = projectList.map((p) => p["id"] as string);

      // Batch-load all sub-projects across the board (1 query instead of N).
      const { data: allSubRows, error: subErr } = projectIds.length
        ? await supabaseAdmin
            .from("sub_projects")
            .select(
              "id, project_id, name, name_th, icon, lead_id, status, priority, due, progress, progress_prev, progress_updated_at, quarter, tags, position, created_at, updated_at",
            )
            .in("project_id", projectIds)
            .order("position", { ascending: true })
        : { data: [] as Record<string, unknown>[], error: null };

      if (subErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to load sub-projects", 500);
      }

      const subList = (allSubRows ?? []) as Record<string, unknown>[];
      const subIds = subList.map((s) => s["id"] as string);
      const leadIds = Array.from(
        new Set(
          subList
            .map((s) => s["lead_id"] as string | null)
            .filter((v): v is string => !!v),
        ),
      );

      // Batch-load all team memberships joined with profiles (1 query).
      const { data: allTeamRows } = subIds.length
        ? await supabaseAdmin
            .from("sub_project_members")
            .select(
              "sub_project_id, profiles(id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at)",
            )
            .in("sub_project_id", subIds)
        : { data: [] as Record<string, unknown>[] };

      const teamsBySub = new Map<string, Profile[]>();
      for (const row of (allTeamRows ?? []) as Record<string, unknown>[]) {
        const subId = row["sub_project_id"] as string;
        const profileRow = row["profiles"] as Record<string, unknown> | null;
        if (!profileRow) continue;
        const list = teamsBySub.get(subId) ?? [];
        list.push(mapProfile(profileRow));
        teamsBySub.set(subId, list);
      }

      // Batch-load all distinct lead profiles (skip if already in board members).
      const memberById = new Map(boardMembers.map((m) => [m.id, m]));
      const missingLeadIds = leadIds.filter((id) => !memberById.has(id));
      if (missingLeadIds.length > 0) {
        const { data: leadRows } = await supabaseAdmin
          .from("profiles")
          .select(
            "id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at",
          )
          .in("id", missingLeadIds);
        for (const row of (leadRows ?? []) as Record<string, unknown>[]) {
          const p = mapProfile(row);
          memberById.set(p.id, p);
        }
      }

      // Group sub-projects by project_id for assembly.
      const subsByProject = new Map<string, Record<string, unknown>[]>();
      for (const sr of subList) {
        const pid = sr["project_id"] as string;
        const list = subsByProject.get(pid) ?? [];
        list.push(sr);
        subsByProject.set(pid, list);
      }

      const projectsWithSubs: ProjectWithSubs[] = projectList.map((pr) => {
        const projectId = pr["id"] as string;
        const projectSubs = subsByProject.get(projectId) ?? [];
        const hydrated = projectSubs.map((sr) => {
          const subId = sr["id"] as string;
          const leadId = sr["lead_id"] as string | null;
          const team = teamsBySub.get(subId) ?? [];
          const lead = leadId ? (memberById.get(leadId) ?? null) : null;
          return mapSubProjectWithRelations(sr, team, lead);
        });
        return mapProjectWithSubs(pr, hydrated);
      });

      const payload: PortfolioPayload = {
        board: mapBoard(boardRow as Record<string, unknown>),
        members: boardMembers,
        projects: projectsWithSubs,
      };

      res.status(200).json({ ok: true, data: payload });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/boards/:id/members
 * Add one member to a board.
 */
router.post(
  "/:id/members",
  requireAuth,
  requireBoardMember("id"),
  requireBoardAdmin("id"),
  validate(AddBoardMemberSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params["id"] as string;
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
        .from("board_members")
        .select("board_id")
        .eq("board_id", boardId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        throw new ApiError("ALREADY_MEMBER", "User is already a board member", 409);
      }

      const { error: insertErr } = await supabaseAdmin
        .from("board_members")
        .insert({ board_id: boardId, user_id: userId });

      if (insertErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to add member", 500);
      }

      const board = await buildBoardWithMeta(boardId);
      res.status(200).json({ ok: true, data: board });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/boards/:id/members/:userId
 * Remove one member from a board. Cannot remove the board owner.
 */
router.delete(
  "/:id/members/:userId",
  requireAuth,
  requireBoardMember("id"),
  requireBoardAdmin("id"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params["id"] as string;
      const userId = req.params["userId"] as string;

      const { data: boardRow } = await supabaseAdmin
        .from("boards")
        .select("owner_id")
        .eq("id", boardId)
        .single();

      if ((boardRow as Record<string, unknown> | null)?.["owner_id"] === userId) {
        throw new ApiError(
          "CANNOT_REMOVE_OWNER",
          "Cannot remove the board owner",
          409,
        );
      }

      const { data: membership } = await supabaseAdmin
        .from("board_members")
        .select("board_id")
        .eq("board_id", boardId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!membership) {
        throw new ApiError("NOT_A_MEMBER", "User is not a board member", 404);
      }

      const { error: deleteErr } = await supabaseAdmin
        .from("board_members")
        .delete()
        .eq("board_id", boardId)
        .eq("user_id", userId);

      if (deleteErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to remove member", 500);
      }

      res.status(200).json({ ok: true, data: { id: userId } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
