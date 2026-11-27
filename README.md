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

- **Keep it beside your lesson:** the first-run card (also in Settings → General) has **Open in its own window**,
  which opens Sidekick as a narrow window on the right edge of the screen, plus step-by-step snapping tips.
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

## Sessions and saved data

Every new visit opens the **workspace chooser** (eight built-in presets in `src/store/presets.ts`).
Nothing personal is loaded until a preset is chosen, and nothing personal is saved before then.

- **Teaching data belongs to one browser tab.** Classes, rosters, layouts, notes, points,
  participation, timers, Quick Dock and class customizations are saved under a session id kept in
  that tab's `sessionStorage`. A normal refresh restores the session. A new tab or a new visit
  starts fresh.
- **Device preferences carry over** (theme, sound, dock position, walkthrough seen) in `localStorage`.
- **Pop-out window** ("Open in its own window") continues the same session; the original window pauses.
- **Duplicated tab**: browsers copy `sessionStorage`, so the copy detects the original (BroadcastChannel)
  and continues with its *own copy* of the session; the two never overwrite each other.
- **Browser limits:** browsers can bring a closed tab back with its `sessionStorage`
  (Ctrl/Cmd+Shift+T, or "continue where you left off" after a restart). Such a session is restored
  only if it was used in the last **12 hours**; older ones start fresh and their data is deleted.
  Session records from closed tabs stay in IndexedDB on the device until they are 12 hours idle,
  then they are deleted on the next visit. They are never loaded by another tab.
  **End session & start fresh** (tap the logo) deletes the current session immediately — use it
  on shared computers.
- **Data from earlier versions** (`sidekick-state` in IndexedDB) is never loaded, changed or deleted
  automatically. Settings → Data & Privacy offers "Bring it into this session" and, separately,
  "Delete it from this device" (both confirmed).
- Automated tests start from a sample workspace with `/?start=sample` (no personal data).

## Offline / installable app

Sidekick is an installable web app (PWA). After one online visit, everything it needs — code,
expectations cards, logo, TEKS/ELPS data — is saved by a service worker (`src/app/sw.ts`, built with
Serwist into `public/sw.js`), so it opens and works with no internet. Teachers install it with the
**Download Sidekick** card (welcome screen, Main menu, Settings → General) or the browser's
install icon (Chrome/Edge/Chromebook), or Share → Add to Home Screen (Safari/iPad).
Only account sign-in needs a connection. New versions are picked up automatically on the next
online launch. `e2e/offline.spec.ts` checks the offline behaviour.

## Teacher accounts (optional, Supabase)

Accounts are off until two public settings are added in Vercel (Project → Settings → Environment
Variables): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Run
`supabase/schema.sql` once in the Supabase SQL editor (it creates `teacher_settings` with row-level
security so each teacher only sees their own row).

- Passwords are handled by Supabase; this app never stores or logs them.
- Only a student-free settings pack is saved (workspaces, layouts, widget settings, favorites,
  routines, theme). Rosters, student names and class records never leave the device.
- Saving is explicit (Main menu → "Save my setup"), so a fresh session never overwrites a saved one.

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

## Mac app (desktop/)

`desktop/` wraps the offline copy of Sidekick in an Electron app for macOS.

    cd desktop && npm install
    npm run build:web      # SIDEKICK_DESKTOP=1 next build → desktop/app (set the NEXT_PUBLIC_SUPABASE_* vars for accounts)
    npm run package:mac    # → desktop/dist/Teacher-Sidekick-Mac-Apple-Silicon.zip and …-Intel.zip

The app is not signed with an Apple Developer ID, so the first launch needs right-click → Open
(or System Settings → Privacy & Security → Open Anyway). Signing/notarizing needs an Apple
Developer account and a Mac.
