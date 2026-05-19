import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "@/api/supabaseAdmin";
import { ApiError } from "@/api/lib/ApiError";

/**
 * Curried middleware: verifies the current user is a member of the board
 * identified by the given URL param name (default "id").
 *
 * Read 403→404 collapse: GET requests return BOARD_NOT_FOUND to prevent
 * UUID enumeration. Write requests return NOT_BOARD_MEMBER (403) because
 * the client already proved it knows the id.
 *
 * NOTE: service-role queries bypass RLS, so membership MUST be enforced
 * here in Express before any service-role query executes.
 */
export function requireBoardMember(boardIdParam = "id") {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const boardId = req.params[boardIdParam];
      if (!boardId) {
        throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
      }

      const isWrite = req.method !== "GET";

      const { data: membership, error } = await supabaseAdmin
        .from("board_members")
        .select("board_id")
        .eq("board_id", boardId)
        .eq("user_id", req.userId)
        .maybeSingle();

      if (error) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Failed to verify board membership",
          500,
        );
      }

      if (!membership) {
        if (isWrite) {
          throw new ApiError(
            "NOT_BOARD_MEMBER",
            "You are not a member of this board",
            403,
          );
        } else {
          throw new ApiError("BOARD_NOT_FOUND", "Board not found", 404);
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
