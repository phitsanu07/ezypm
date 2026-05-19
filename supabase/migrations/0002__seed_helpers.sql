-- Decision: portfolio payload is built in TypeScript (boards.routes.ts → GET /:id/portfolio)
-- rather than as a DB view. This avoids complex JSON aggregation SQL and gives more control
-- over hydration of nested relations (team members, lead profiles).
-- This file is intentionally minimal — no view is created.

-- Placeholder comment so the migration file exists and the decision is documented.
select 1; -- no-op
