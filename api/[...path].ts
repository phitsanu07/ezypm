// Vercel serverless function entrypoint. Wraps the Express app so every
// /api/* request enters the same router used in local dev.
import { app } from "../src/api/server";

export default app;

export const config = {
  runtime: "nodejs",
};
