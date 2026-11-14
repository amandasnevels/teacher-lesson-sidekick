# Teacher Lesson Sidekick

**Your classroom tools. Your layout. Your teaching flow.**

A compact, customizable classroom widget toolbox designed to live in a narrow browser window
(280–400 px) beside your slides or lesson plan — and to scale up gracefully to tablets,
touchscreens and full desktops. Everything is saved locally in your browser; no account needed.

## Quick start

Requirements: Node.js 20+ (tested on Node 22) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm start            # http://localhost:3000
```

> The microphone noise meter requires a secure context: `https://` or `http://localhost`.

## Tests

```bash
npm run typecheck    # TypeScript
npm test             # Vitest + React Testing Library (unit & component)
npm run build && npm run e2e   # Playwright end-to-end (starts `next start` on port 3123)
```

If Playwright's browser isn't installed on your machine, run `npx playwright install chromium` once.

## Using it

- **＋ Add** opens the Widget Library (search, categories, Favorites, Removed Widgets, Packs).
- Move widgets by their **⠿ handle** (mouse, touch, or keyboard: focus handle → Space → arrows → Space).
- Resize widgets by dragging either **bottom corner**. Width snaps to grid columns; double-click a corner to fit
  the height to the content again. Narrow windows stack widgets without changing your saved sizes.
- Each widget's **⋯ menu**: Duplicate · Save Favorite · Change Color · Lock/Unlock · Expand · Remove · More Settings.
- **Quick Dock** (bottom by default; top/left/right in Settings) holds one-tap actions, routines, favorites and widgets.
- **Quick Find**: `Ctrl/⌘+K` or `/`. Try `5 min timer`, `pick student`, `roll dice`, `flip coin`, `spinner`.
- **Classes** and **Workspaces** are separate selectors in the header; a class can optionally have a default workspace.
- Student tools offer quick roster setup in place (paste names, CSV import, or a fictional demo class).

Keyboard shortcuts (toggle in Settings → More options): `Ctrl/⌘+K` Quick Find · `Alt+Shift+T` start/pause focused
timer · `Alt+Shift+P` pick student · `Alt+Shift+A` widget library · `Alt+Shift+Z` undo · `Alt+Shift+R` run selected routine.

## Deploying to Vercel (when you're ready)

This is a standard Next.js app with no server-side data or secrets, so it deploys with defaults.
**Do not deploy publicly until you have approved it.**

1. Push this folder to a Git repository (GitHub, GitLab or Bitbucket).
2. In Vercel: **Add New → Project**, import the repository. Framework preset: **Next.js**.
   Build command `npm run build`, output handled automatically. No environment variables are needed.
3. Deploy. Vercel serves over HTTPS, so the microphone meter works.
4. Optional: keep it private with Vercel's Deployment Protection (password / Vercel Authentication) while piloting.

CLI alternative: `npm i -g vercel`, then `vercel` (preview) and `vercel --prod` (production).

Because all data is stored in each teacher's own browser (IndexedDB), a deployment does not collect or
store any student information on a server.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for design decisions and
[`docs/STATUS.md`](docs/STATUS.md) for the feature checklist and known limitations.
