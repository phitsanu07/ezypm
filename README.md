# ezypm — Easy Project Management

Simple project management tool. The primary view is **GridWork**: a Kanban-style task grid (columns = status, cards = tasks) for a selected project.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind + Zustand + TanStack Query
- **Backend**: Express + TypeScript + Prisma + SQLite (Supabase Postgres compatible)
- **Tests**: Vitest (unit/integration) + Playwright (E2E)

## Structure

```
src/
  types/      — shared TS contracts (Lead-owned)
  frontend/   — React UI (owned by frontend-builder)
  api/        — Express routes & middleware (owned by backend-api)
prisma/       — schema, migrations, seed (owned by backend-api)
tests/        — integration + E2E (owned by qa-tester)
```

## Dev

```bash
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev          # api on :3001, fe on :5173
```
