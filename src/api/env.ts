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

let _cached: Env | null = null;

export function getEnv(): Env {
  if (_cached) return _cached;
  const raw = {
    SUPABASE_URL:
      process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"],
    SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
    PORT: process.env["PORT"],
    NODE_ENV: process.env["NODE_ENV"],
  };
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    throw new Error(
      `Env validation failed: ${JSON.stringify(fieldErrors)}`,
    );
  }
  _cached = result.data;
  return _cached;
}

// Lazy proxy preserves the existing `import { env } from "@/api/env"` API
// without triggering validation at module load. Useful for serverless
// functions where init errors must be catchable by the request handler.
export const env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    return getEnv()[prop as keyof Env];
  },
});
