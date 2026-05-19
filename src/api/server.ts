import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "@/api/env";
import { errorHandler } from "@/api/middleware/errorHandler";
import authRouter from "@/api/routes/auth.routes";
import boardsRouter from "@/api/routes/boards.routes";
import projectsRouter from "@/api/routes/projects.routes";
import subProjectsRouter from "@/api/routes/subProjects.routes";
import activitiesRouter from "@/api/routes/activities.routes";
import adminRouter from "@/api/routes/admin.routes";

export const app = express();

// 1. CORS
const prodAllowList = (process.env["CORS_ORIGIN"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.NODE_ENV === "production") {
        return callback(null, prodAllowList.includes(origin));
      }
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);

// 2. Helmet (security headers; CSP relaxed — API only, no HTML)
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

// 3. Morgan request logging
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// 4. Body parsers
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false }));

// 5. Route handlers
app.use("/api/auth", authRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/sub-projects", subProjectsRouter);

// Activities router handles both /api/sub-projects/:id/activities and /api/activities/:id
app.use("/api", activitiesRouter);

app.use("/api/admin", adminRouter);

// 6. 404 fallback for unmatched routes
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

// 7. Global error handler — must be last
app.use(errorHandler);

// Start the listener only when running as a long-lived process (local dev or
// `node start`). Skip when imported by tests, Vercel functions, or bundlers.
const shouldListen =
  process.env["NODE_ENV"] !== "test" &&
  !process.env["VERCEL"] &&
  !process.env["LAMBDA_TASK_ROOT"];

if (shouldListen) {
  app.listen(env.PORT, () => {
    console.info(`GridWork API running on http://localhost:${env.PORT}`);
  });
}
