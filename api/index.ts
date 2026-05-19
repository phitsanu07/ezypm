// Vercel serverless function that routes all /api/* requests through the
// Express app. Wraps module-load + invocation in try/catch so any failure
// surfaces as a JSON envelope instead of an opaque FUNCTION_INVOCATION_FAILED.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";

let app: Express | null = null;
let initError: Error | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app = (require("../src/api/server") as { app: Express }).app;
} catch (err) {
  initError = err instanceof Error ? err : new Error(String(err));
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (initError) {
    res.status(500).json({
      ok: false,
      error: {
        code: "INIT_FAILED",
        message: initError.message,
        stack: initError.stack,
      },
    });
    return;
  }
  if (!app) {
    res.status(500).json({
      ok: false,
      error: { code: "NO_APP", message: "Express app not initialized" },
    });
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as unknown as (q: any, s: any) => void)(req, res);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: {
        code: "INVOKE_FAILED",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    });
  }
}
