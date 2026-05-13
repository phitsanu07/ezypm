# Design Reference (DO NOT BUILD ON TOP OF THESE FILES)

This folder is a verbatim mirror of `project-management/project/` — the source design exported from claude.ai/design. **It exists solely so the frontend agent can read it for pixel-perfect reproduction.**

## Don't

- Don't `import` from this folder. Don't bundle it. It is excluded from `tsconfig.json` and should never appear in compiled output.
- Don't edit it. It is a frozen reference snapshot.
- Don't ship it to production.

## Do

- **Read it.** `GridWork.html` is the primary view to port. `login.html` and `admin.html` are the other two screens.
- **Port the markup** from the JSX prototypes into idiomatic React + TypeScript components under `src/frontend/`.
- **Port the styles** from `src/styles.css` into `src/frontend/styles/` — keep CSS variables and class names as-is so the visual result stays pixel-perfect.
- **Port the behavior** described in `app.jsx`, `grid.jsx`, `cells.jsx` (keyboard nav, popovers, drag-reorder, undo/redo).
- **Replace persistence**: design uses `localStorage`; the real app uses Supabase. Swap `auth.js` and `boards.js` for Supabase Auth + queries.
