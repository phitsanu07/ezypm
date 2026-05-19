import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { requireAuth } from "@/api/middleware/requireAuth";
import { validate } from "@/api/middleware/validate";
import { LoginSchema } from "@/api/schemas/auth";
import { ApiError } from "@/api/lib/ApiError";
import { mapProfile } from "@/api/lib/mappers";
import type { MeResponse, LoginResponse, BoardWithMeta } from "@/types";

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

      const boards: BoardWithMeta[] = [];

      for (const boardId of boardIds) {
        const { data: boardRow, error: boardError } = await supabaseAdmin
          .from("boards")
          .select("id, name, name_th, icon, color, owner_id, created_at, updated_at")
          .eq("id", boardId)
          .single();

        if (boardError || !boardRow) continue;

        const { data: membersRows } = await supabaseAdmin
          .from("board_members")
          .select(
            "profiles(id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at)",
          )
          .eq("board_id", boardId);

        const members = (membersRows ?? [])
          .map((r: Record<string, unknown>) => {
            const p = r["profiles"] as Record<string, unknown> | null;
            return p ? mapProfile(p) : null;
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

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

        boards.push({
          id: (boardRow as Record<string, unknown>)["id"] as string,
          name: (boardRow as Record<string, unknown>)["name"] as string,
          nameTh:
            ((boardRow as Record<string, unknown>)["name_th"] as string | null) ??
            null,
          icon: (boardRow as Record<string, unknown>)["icon"] as string,
          color: (boardRow as Record<string, unknown>)["color"] as string,
          ownerId: (boardRow as Record<string, unknown>)["owner_id"] as string,
          createdAt: (boardRow as Record<string, unknown>)["created_at"] as string,
          updatedAt: (boardRow as Record<string, unknown>)["updated_at"] as string,
          memberIds: members.map((m) => m.id),
          members,
          projectCount: projectCount ?? 0,
          subProjectCount,
        });
      }

      const data: MeResponse = { profile: req.profile, boards };
      res.status(200).json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
