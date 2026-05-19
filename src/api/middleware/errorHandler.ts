import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/api/lib/ApiError";
import { env } from "@/api/env";

/**
 * Global error handler — must be the LAST middleware in the Express stack.
 * Converts ApiError instances to the API envelope.
 * Unknown errors are logged server-side and returned as INTERNAL_ERROR.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (env.NODE_ENV !== "test") {
    console.error("[INTERNAL_ERROR]", err);
  }

  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
