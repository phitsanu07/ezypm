// Vercel serverless function — uses createRequire (Node ESM-CJS interop) to
// load the pre-compiled CJS bundle from dist/api/. Lazy loading + try/catch
// surfaces init errors as JSON instead of an opaque FUNCTION_INVOCATION_FAILED.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any = null;
let initErr: Error | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApp(): any {
  if (app) return app;
  if (initErr) throw initErr;
  try {
    const mod = require("../compiled/api/api/server.js");
    app = mod.app;
    return app;
  } catch (err) {
    initErr = err instanceof Error ? err : new Error(String(err));
    throw initErr;
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const a = getApp();
    return a(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        error: {
          code: "INIT_OR_INVOKE_FAILED",
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
      });
    }
  }
}
