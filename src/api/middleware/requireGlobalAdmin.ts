import type { Request, Response, NextFunction } from "express";
import { ApiError } from "@/api/lib/ApiError";

/**
 * Allows only users with global role "admin".
 * Applied on all /api/admin/* routes.
 */
export function requireGlobalAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.profile.role !== "admin") {
    next(new ApiError("FORBIDDEN", "Global admin access required", 403));
    return;
  }
  next();
}
