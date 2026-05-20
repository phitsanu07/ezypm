// Import env.ts BUT don't access the env proxy. If this 500s → side effects
// (like dotenv/config) at module load are the issue. If 200 → accessing env
// is what crashes (validation).

import type { VercelRequest, VercelResponse } from "@vercel/node";
import "../src/api/env";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ ok: true, msg: "env module imported without access" });
}
