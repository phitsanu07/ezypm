import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    data: {
      service: "vercel-functions",
      runtime: "nodejs",
      env_check: {
        SUPABASE_URL: !!process.env["SUPABASE_URL"],
        SUPABASE_SERVICE_ROLE_KEY: !!process.env["SUPABASE_SERVICE_ROLE_KEY"],
      },
      now: new Date().toISOString(),
    },
  });
}
