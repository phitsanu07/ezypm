import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError } from "@/api/lib/ApiError";

declare global {
  namespace Express {
    interface Request {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validated: any;
    }
  }
}

/**
 * Validates req.body against the provided Zod schema.
 * On failure, throws ApiError with code Z_VALIDATION and flattened details.
 * On success, attaches the parsed value to req.validated.
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(
        new ApiError(
          "Z_VALIDATION",
          "Validation failed",
          400,
          result.error.flatten(),
        ),
      );
      return;
    }
    req.validated = result.data;
    next();
  };
}

/**
 * Validates req.query against the provided Zod schema.
 * On failure, throws ApiError with code Z_VALIDATION.
 * On success, attaches the parsed value to req.validated.
 */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(
        new ApiError(
          "Z_VALIDATION",
          "Invalid query parameters",
          400,
          result.error.flatten(),
        ),
      );
      return;
    }
    req.validated = result.data;
    next();
  };
}
