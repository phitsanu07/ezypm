// Single Vercel serverless function that handles all /api/* routes.
// Vercel rewrites /api/(.*) → /api which hits this file. Inside, the Express
// app sees the original req.url (preserved by Vercel) and dispatches to its
// registered routes (app.use("/api/auth", ...), etc.).

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app } from "../src/api/server";

export default function handler(req: VercelRequest, res: VercelResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (app as unknown as (q: any, s: any) => void)(req, res);
}
