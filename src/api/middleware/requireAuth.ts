import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { ApiError } from "@/api/lib/ApiError";
import type { Profile } from "@/types";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      profile: Profile;
    }
  }
}

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row["id"] as string,
    email: row["email"] as string,
    name: row["name"] as string,
    nameTh: (row["name_th"] as string) ?? "",
    role: row["role"] as Profile["role"],
    status: row["status"] as Profile["status"],
    color: row["color"] as string,
    initials: row["initials"] as string,
    lastActiveAt: (row["last_active_at"] as string | null) ?? null,
    suspendedAt: (row["suspended_at"] as string | null) ?? null,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

/**
 * Validates the Bearer JWT via Supabase Auth.
 * Attaches req.userId and req.profile.
 * Rejects suspended users with 403 USER_SUSPENDED.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      throw new ApiError("UNAUTHENTICATED", "No token provided", 401);
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      throw new ApiError("UNAUTHENTICATED", "Invalid or expired token", 401);
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

    const profile = rowToProfile(profileRow as Record<string, unknown>);

    if (profile.status === "suspended") {
      throw new ApiError(
        "USER_SUSPENDED",
        "Your account has been suspended",
        403,
      );
    }

    req.userId = profile.id;
    req.profile = profile;

    next();
  } catch (err) {
    next(err);
  }
}
