// Vercel serverless function — routes /api/* through the Express app.
// Uses a STATIC import so esbuild inlines the entire dependency tree into
// the function bundle (dynamic import() leaves an unresolved runtime path).

import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";
import { app as expressApp } from "../src/api/server";

const app: Express = expressApp;

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as unknown as (q: any, s: any) => void)(req, res);
  } catch (err) {
    if (!res.headersSent) {
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
}
