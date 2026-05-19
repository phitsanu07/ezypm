// Minimal Express handler to isolate whether Express itself works on Vercel
// or our src/api/server.ts has an init-time crash.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";

const tmp = express();
tmp.get("/api/diag", (_req, res) => {
  res.json({
    ok: true,
    data: {
      message: "minimal express works on vercel",
      runtime: process.version,
      env: {
        NODE_ENV: process.env["NODE_ENV"] ?? null,
        VERCEL: process.env["VERCEL"] ?? null,
        SUPABASE_URL_present: !!process.env["SUPABASE_URL"],
        SUPABASE_SERVICE_ROLE_KEY_present:
          !!process.env["SUPABASE_SERVICE_ROLE_KEY"],
      },
    },
  });
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tmp as unknown as (q: any, s: any) => void)(req, res);
}
