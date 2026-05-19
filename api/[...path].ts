// Vercel serverless function entrypoint. Wraps the Express app so every
// /api/* request enters the same router used in local dev.
//
// Notes:
// - We import Express via a relative path (no `@/` alias) so esbuild doesn't
//   need to resolve tsconfig paths from this entry file.
// - Inside server.ts the alias imports are resolved by esbuild via the root
//   tsconfig.json's `paths` field during bundling.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app } from "../src/api/server";

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express's app is callable as (req, res, next?) — delegate the request.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (app as unknown as (q: any, s: any) => void)(req, res);
}
