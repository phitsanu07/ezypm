import { createClient } from "@supabase/supabase-js";
import { env } from "@/api/env";

/**
 * Service-role Supabase client — bypasses RLS.
 * ONLY import this on the server. Never expose to the browser.
 * All board-membership and role checks are enforced by Express middleware
 * before any service-role query executes.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
