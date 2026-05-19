import type { ApiErrorCode } from "@/types";

/**
 * Thrown by route handlers and middleware to signal a known, user-facing error.
 * The global errorHandler catches these and serializes them into the API envelope.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
