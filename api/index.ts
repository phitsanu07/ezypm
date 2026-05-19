// Vercel serverless function — routes /api/* through the Express app.
// Uses dynamic import() so init errors surface as JSON instead of an opaque
// FUNCTION_INVOCATION_FAILED.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";

let appPromise: Promise<Express> | null = null;

function loadApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = import("../src/api/server").then((m) => m.app);
  }
  return appPromise;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  let app: Express;
  try {
    app = await loadApp();
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: {
        code: "INIT_FAILED",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
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
