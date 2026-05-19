import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { ApiError } from "@/api/lib/ApiError";

/**
 * Curried middleware: allows iff the caller is a global admin OR the board owner.
 * Always applied after requireBoardMember.
 */
export function requireBoardAdmin(boardIdParam = "id") {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (req.profile.role === "admin") {
        return next();
      }

      const boardId = req.params[boardIdParam];
      if (!boardId) {
        throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
      }

      const { data: board, error } = await supabaseAdmin
        .from("boards")
        .select("owner_id")
        .eq("id", boardId)
        .maybeSingle();

      if (error || !board) {
        throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
      }

      const row = board as { owner_id: string };
      if (row.owner_id !== req.userId) {
        throw new ApiError(
          "FORBIDDEN",
          "Only board owner or global admin can perform this action",
          403,
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
