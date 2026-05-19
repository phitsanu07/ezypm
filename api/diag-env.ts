// Test if importing just env.ts crashes. If this 500s → env.ts is the culprit.
// If 200 → server.ts deeper imports are the issue.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "../src/api/env";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({
    ok: true,
    data: {
      msg: "env imported successfully",
      NODE_ENV: env.NODE_ENV,
      SUPABASE_URL_set: !!env.SUPABASE_URL,
      SUPABASE_URL_starts: env.SUPABASE_URL?.slice(0, 30),
    },
  });
}
