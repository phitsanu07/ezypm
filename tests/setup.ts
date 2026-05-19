// Set required env vars before any module (including env.ts) loads.
// This file runs first via vitest setupFiles.
process.env["NODE_ENV"] = "test";
process.env["SUPABASE_URL"] = "https://test.supabase.co";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";
process.env["PORT"] = "3001";
