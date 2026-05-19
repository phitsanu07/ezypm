import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { requireAuth } from "@/api/middleware/requireAuth";
import { requireGlobalAdmin } from "@/api/middleware/requireGlobalAdmin";
import { validate } from "@/api/middleware/validate";
import {
  InviteUserSchema,
  UpdateUserSchema,
} from "@/api/schemas/admin";
import {
  CreateBoardSchema,
  UpdateBoardSchema,
} from "@/api/schemas/board";
import { ApiError } from "@/api/lib/ApiError";
import { mapProfile, mapBoard, deriveInitials } from "@/api/lib/mappers";

const router = Router();

// All admin routes require auth + global admin role
router.use(requireAuth, requireGlobalAdmin);

/**
 * GET /api/admin/users
 * List all profiles (any status).
 */
router.get(
  "/users",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { data: rows, error } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at",
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw new ApiError("INTERNAL_ERROR", "Failed to load users", 500);
      }

      const users = (rows ?? []).map((r) =>
        mapProfile(r as Record<string, unknown>),
      );

      res.status(200).json({ ok: true, data: users });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/admin/users
 * Invite a user: creates auth.users row then inserts the profiles row.
 */
router.post(
  "/users",
  validate(InviteUserSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.validated as {
        email: string;
        name: string;
        nameTh?: string;
        role: string;
        color?: string;
        password: string;
      };

      // First check the profiles table — fast path for "real" duplicates
      const normalizedEmail = body.email.trim().toLowerCase();
      const { data: matches, error: matchErr } = await supabaseAdmin
        .from("profiles")
        .select("id, email, name, status, created_at")
        .or(
          `email.eq.${normalizedEmail},email.ilike.${normalizedEmail.replace(/[,()]/g, "")}`,
        );

      if (matchErr) {
        console.error("[invite] profiles lookup error:", matchErr);
      }
      console.info(
        `[invite] email=${normalizedEmail} matches=${matches?.length ?? 0}`,
        matches,
      );

      if (matches && matches.length > 0) {
        const first = matches[0] as { id: string; email: string };
        throw new ApiError(
          "EMAIL_TAKEN",
          `Email "${body.email}" already has a profile (id=${first.id}, email=${first.email}). Check Supabase Dashboard → Table Editor → profiles.`,
          409,
        );
      }

      let authUserId: string | null = null;

      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
        });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
          // Orphan auth.users entry — adopt it by looking up its id then inserting profile
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const orphan = list?.users.find(
            (u) => u.email?.toLowerCase() === body.email.toLowerCase(),
          );
          if (!orphan) {
            throw new ApiError(
              "EMAIL_TAKEN",
              `Email "${body.email}" is already registered in auth but not findable — please delete it from Supabase Dashboard → Authentication → Users and try again`,
              409,
            );
          }
          authUserId = orphan.id;
        } else {
          throw new ApiError("INTERNAL_ERROR", authError.message, 500);
        }
      } else {
        if (!authData.user) {
          throw new ApiError("INTERNAL_ERROR", "Failed to create auth user", 500);
        }
        authUserId = authData.user.id;
      }

      const initials = deriveInitials(body.name);

      // upsert (not insert) so we cleanly overwrite any auto-created profile
      // row created by an auth.users trigger
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: authUserId,
            email: body.email,
            name: body.name,
            name_th: body.nameTh ?? "",
            role: body.role,
            status: "invited",
            color: body.color ?? "#7C5CFF",
            initials,
          },
          { onConflict: "id" },
        )
        .select(
          "id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at",
        )
        .single();

      if (insertErr || !inserted) {
        console.error("[invite] insert profile failed:", {
          authUserId,
          code: insertErr?.code,
          message: insertErr?.message,
          details: insertErr?.details,
          hint: insertErr?.hint,
        });

        // Look up what row is blocking us — by id (most likely cause)
        const { data: blockingById } = await supabaseAdmin
          .from("profiles")
          .select("id, email, name, status")
          .eq("id", authUserId)
          .maybeSingle();
        console.error("[invite] blocking profile by id:", blockingById);

        // Only roll back auth user if WE created it (not if we adopted an orphan)
        if (authData?.user) {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        }
        if (
          insertErr?.code === "23505" ||
          insertErr?.message.toLowerCase().includes("unique")
        ) {
          const blockedEmail = blockingById?.email ?? "unknown";
          throw new ApiError(
            "EMAIL_TAKEN",
            `Email "${body.email}" — auth user id ${authUserId} already has a profile with email "${blockedEmail}". Delete that profile in Supabase Dashboard or use a different email.`,
            409,
          );
        }
        throw new ApiError(
          "INTERNAL_ERROR",
          `Failed to create profile: ${insertErr?.message ?? "unknown"}`,
          500,
        );
      }

      res
        .status(201)
        .json({
          ok: true,
          data: mapProfile(inserted as Record<string, unknown>),
        });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/admin/users/:id
 * Hard-delete an orphan profile + auth.users row. Use ONLY for cleanup of
 * profiles that were left behind by a failed invite. MVP normally uses
 * soft-delete via PUT status=suspended.
 */
router.delete(
  "/users/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetId = req.params["id"] as string;

      if (targetId === req.userId) {
        throw new ApiError(
          "FORBIDDEN",
          "Admins cannot delete their own profile",
          403,
        );
      }

      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("id", targetId)
        .maybeSingle();

      const { error: deleteProfileErr } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", targetId);

      if (deleteProfileErr) {
        console.error("[delete-user] profile delete error:", deleteProfileErr);
      }

      const { error: deleteAuthErr } =
        await supabaseAdmin.auth.admin.deleteUser(targetId);

      if (deleteAuthErr) {
        console.error("[delete-user] auth delete error:", deleteAuthErr);
      }

      res.status(200).json({
        ok: true,
        data: {
          id: targetId,
          deletedProfile: existing,
          authDeleted: !deleteAuthErr,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/admin/users/:id
 * Update profile fields. Suspending sets status='suspended' + suspended_at=now().
 */
router.put(
  "/users/:id",
  validate(UpdateUserSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetId = req.params["id"] as string;

      const body = req.validated as {
        name?: string;
        nameTh?: string;
        role?: string;
        status?: string;
        color?: string;
      };

      if (body.status === "suspended" && targetId === req.userId) {
        throw new ApiError(
          "CANNOT_SUSPEND_SELF",
          "You cannot suspend your own account",
          409,
        );
      }

      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id, status")
        .eq("id", targetId)
        .maybeSingle();

      if (!existing) {
        throw new ApiError("USER_NOT_FOUND", "User not found", 404);
      }

      const updatePayload: Record<string, unknown> = {};
      if (body.name !== undefined) {
        updatePayload["name"] = body.name;
        updatePayload["initials"] = deriveInitials(body.name);
      }
      if (body.nameTh !== undefined) updatePayload["name_th"] = body.nameTh;
      if (body.role !== undefined) updatePayload["role"] = body.role;
      if (body.color !== undefined) updatePayload["color"] = body.color;

      if (body.status !== undefined) {
        updatePayload["status"] = body.status;
        if (body.status === "suspended") {
          updatePayload["suspended_at"] = new Date().toISOString();
        } else {
          updatePayload["suspended_at"] = null;
        }
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .eq("id", targetId)
        .select(
          "id, email, name, name_th, role, status, color, initials, last_active_at, suspended_at, created_at, updated_at",
        )
        .single();

      if (updateErr || !updated) {
        throw new ApiError("INTERNAL_ERROR", "Failed to update user", 500);
      }

      res
        .status(200)
        .json({
          ok: true,
          data: mapProfile(updated as Record<string, unknown>),
        });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/admin/boards
 * Create a board. Optionally with initial memberIds.
 */
router.post(
  "/boards",
  validate(CreateBoardSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.validated as {
        name: string;
        nameTh?: string | null;
        icon?: string;
        color?: string;
        memberIds?: string[];
      };

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("boards")
        .insert({
          name: body.name,
          name_th: body.nameTh ?? null,
          icon: body.icon ?? "▦",
          color: body.color ?? "#7C5CFF",
          owner_id: req.userId,
        })
        .select(
          "id, name, name_th, icon, color, owner_id, created_at, updated_at",
        )
        .single();

      if (insertErr || !inserted) {
        throw new ApiError("INTERNAL_ERROR", "Failed to create board", 500);
      }

      const boardId = (inserted as Record<string, unknown>)["id"] as string;

      // Add creator as member
      const memberIds = [req.userId, ...(body.memberIds ?? [])];
      const uniqueIds = [...new Set(memberIds)];

      await supabaseAdmin.from("board_members").insert(
        uniqueIds.map((uid) => ({ board_id: boardId, user_id: uid })),
      );

      res
        .status(201)
        .json({
          ok: true,
          data: mapBoard(inserted as Record<string, unknown>),
        });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/admin/boards/:id
 * Rename / re-color / re-icon a board.
 */
router.put(
  "/boards/:id",
  validate(UpdateBoardSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params["id"] as string;

      const { data: existing } = await supabaseAdmin
        .from("boards")
        .select("id")
        .eq("id", boardId)
        .maybeSingle();

      if (!existing) {
        throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
      }

      const body = req.validated as {
        name?: string;
        nameTh?: string | null;
        icon?: string;
        color?: string;
      };

      const updatePayload: Record<string, unknown> = {};
      if (body.name !== undefined) updatePayload["name"] = body.name;
      if (body.nameTh !== undefined) updatePayload["name_th"] = body.nameTh;
      if (body.icon !== undefined) updatePayload["icon"] = body.icon;
      if (body.color !== undefined) updatePayload["color"] = body.color;

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("boards")
        .update(updatePayload)
        .eq("id", boardId)
        .select(
          "id, name, name_th, icon, color, owner_id, created_at, updated_at",
        )
        .single();

      if (updateErr || !updated) {
        throw new ApiError("INTERNAL_ERROR", "Failed to update board", 500);
      }

      res
        .status(200)
        .json({
          ok: true,
          data: mapBoard(updated as Record<string, unknown>),
        });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/admin/boards/:id
 * Hard delete a board. Cascades to projects/sub-projects/activities.
 */
router.delete(
  "/boards/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const boardId = req.params["id"] as string;

      const { data: existing } = await supabaseAdmin
        .from("boards")
        .select("id")
        .eq("id", boardId)
        .maybeSingle();

      if (!existing) {
        throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
      }

      const { error: deleteErr } = await supabaseAdmin
        .from("boards")
        .delete()
        .eq("id", boardId);

      if (deleteErr) {
        throw new ApiError("INTERNAL_ERROR", "Failed to delete board", 500);
      }

      res.status(200).json({ ok: true, data: { id: boardId } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
