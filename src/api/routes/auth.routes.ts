import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { requireAuth } from "@/api/middleware/requireAuth";
import { validate } from "@/api/middleware/validate";
import { LoginSchema } from "@/api/schemas/auth";
import { ApiError } from "@/api/lib/ApiError";
import { mapProfile } from "@/api/lib/mappers";
import type {
  MeResponse,
  LoginResponse,
  BoardWithMeta,
  Profile,
} from "@/types";

const router = Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: "RATE_LIMITED", message: "Too many login attempts" },
  },
});

/**
 * POST /api/auth/login
 * Thin wrapper around Supabase signInWithPassword — returns envelope response.
 */
router.post(
  "/login",
  loginRateLimit,
  validate(LoginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.validated as {
        email: string;
        password: string;
      };

      const { data: authData, error: authError } =
        await supabaseAdmin.auth.signInWithPassword({ email, password });

      if (authError || !authData.session || !authData.user) {
        throw new ApiError(
          "INVALID_CREDENTIALS",
          "Invalid email or password",
          401,
        );
      }

      const { data: profileRow, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at",
        )
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profileRow) {
        throw new ApiError(
          "PROFILE_MISSING",
          "User profile not found — contact admin",
          401,
        );
      }

      const profile = mapProfile(profileRow as Record<string, unknown>);

      if (profile.status === "suspended") {
        throw new ApiError(
          "USER_SUSPENDED",
          "Your account has been suspended",
          403,
        );
      }

      const data: LoginResponse = {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        profile,
      };

      res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/logout
 * Revokes the current session server-side.
 */
router.post(
  "/logout",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.headers.authorization?.slice(7) ?? "";
      await supabaseAdmin.auth.admin.signOut(token);
      res.status(200).json({ ok: true, data: { ok: true } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/auth/me
 * Returns the current profile and the boards they belong to.
 */
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { data: memberRows, error: memberError } = await supabaseAdmin
        .from("board_members")
        .select("board_id")
        .eq("user_id", req.userId);

      if (memberError) {
        throw new ApiError("INTERNAL_ERROR", "Failed to load boards", 500);
      }

      const boardIds = (memberRows ?? []).map(
        (r: Record<string, unknown>) => r["board_id"] as string,
      );

      if (boardIds.length === 0) {
        const data: MeResponse = { profile: req.profile, boards: [] };
        res.status(200).json({ ok: true, data });
        return;
      }

      // Batch-load boards, members (with profiles), and projects in parallel.
      const [boardsRes, allMembersRes, projectsRes] = await Promise.all([
        supabaseAdmin
          .from("boards")
          .select(
            "id, name, name_th, icon, color, owner_id, created_at, updated_at",
          )
          .in("id", boardIds),
        supabaseAdmin
          .from("board_members")
          .select(
            "board_id, profiles(id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at)",
          )
          .in("board_id", boardIds),
        supabaseAdmin.from("projects").select("id, board_id").in("board_id", boardIds),
      ]);

      const membersByBoard = new Map<string, Profile[]>();
      for (const row of (allMembersRes.data ?? []) as Record<string, unknown>[]) {
        const bid = row["board_id"] as string;
        const p = row["profiles"] as Record<string, unknown> | null;
        if (!p) continue;
        const list = membersByBoard.get(bid) ?? [];
        list.push(mapProfile(p));
        membersByBoard.set(bid, list);
      }

      const projectsByBoard = new Map<string, string[]>();
      const allProjectIds: string[] = [];
      for (const row of (projectsRes.data ?? []) as Record<string, unknown>[]) {
        const bid = row["board_id"] as string;
        const pid = row["id"] as string;
        const list = projectsByBoard.get(bid) ?? [];
        list.push(pid);
        projectsByBoard.set(bid, list);
        allProjectIds.push(pid);
      }

      // Count sub-projects grouped by project_id in a single query.
      const subCountByProject = new Map<string, number>();
      if (allProjectIds.length > 0) {
        const { data: subRows } = await supabaseAdmin
          .from("sub_projects")
          .select("project_id")
          .in("project_id", allProjectIds);
        for (const row of (subRows ?? []) as Record<string, unknown>[]) {
          const pid = row["project_id"] as string;
          subCountByProject.set(pid, (subCountByProject.get(pid) ?? 0) + 1);
        }
      }

      const boards: BoardWithMeta[] = ((boardsRes.data ?? []) as Record<
        string,
        unknown
      >[]).map((boardRow) => {
        const bid = boardRow["id"] as string;
        const members = membersByBoard.get(bid) ?? [];
        const pIds = projectsByBoard.get(bid) ?? [];
        const subProjectCount = pIds.reduce(
          (sum, pid) => sum + (subCountByProject.get(pid) ?? 0),
          0,
        );
        return {
          id: bid,
          name: boardRow["name"] as string,
          nameTh: (boardRow["name_th"] as string | null) ?? null,
          icon: boardRow["icon"] as string,
          color: boardRow["color"] as string,
          ownerId: boardRow["owner_id"] as string,
          createdAt: boardRow["created_at"] as string,
          updatedAt: boardRow["updated_at"] as string,
          memberIds: members.map((m) => m.id),
          members,
          projectCount: pIds.length,
          subProjectCount,
        };
      });

      const data: MeResponse = { profile: req.profile, boards };
      res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
