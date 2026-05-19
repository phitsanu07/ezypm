import { z } from "zod";
import "dotenv/config";

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PORT: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 3001)),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  const raw = {
    SUPABASE_URL:
      process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"],
    SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
    PORT: process.env["PORT"],
    NODE_ENV: process.env["NODE_ENV"],
  };

  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    console.error("Missing or invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
