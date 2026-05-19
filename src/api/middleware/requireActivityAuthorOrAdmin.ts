import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { ApiError } from "@/api/lib/ApiError";

/**
 * Curried middleware: allows iff caller is the activity author OR a global admin.
 * Used on PUT /api/activities/:id and DELETE /api/activities/:id.
 */
export function requireActivityAuthorOrAdmin(activityIdParam = "id") {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (req.profile.role === "admin") {
        return next();
      }

      const activityId = req.params[activityIdParam];
      if (!activityId) {
        throw new ApiError("ACTIVITY_NOT_FOUND", "Activity not found", 404);
      }

      const { data: activity, error } = await supabaseAdmin
        .from("activities")
        .select("author_id")
        .eq("id", activityId)
        .maybeSingle();

      if (error || !activity) {
        throw new ApiError("ACTIVITY_NOT_FOUND", "Activity not found", 404);
      }

      const row = activity as { author_id: string | null };
      if (row.author_id !== req.userId) {
        throw new ApiError(
          "FORBIDDEN",
          "Only the activity author or admin can modify this activity",
          403,
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
