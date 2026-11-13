# Architecture notes

## Stack
Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS 4, Zustand 5, dnd-kit, idb-keyval (IndexedDB),
lucide-react icons. Web Audio API for synthesized sounds and the microphone meter. Vitest + React Testing
Library, Playwright. The app renders client-side only (`components/ClientApp.tsx`) because it is local-first.

## Layout of the code
```
src/
  app/                 Next.js entry (layout, page, global CSS/themes)
  lib/                 Pure logic: types, geometry (dice/spinner/coin), commands parser, roster/CSV,
                       schedule, audio, micMeter, themes, colors, exportPack
  store/               Zustand store (store.ts), defaults, persistence (persist.ts),
                       cross-cutting actions (actions.ts: routines, dock, Quick Find), hooks
  widgets/             One folder per widget (Body / Mini / Settings), definitions.ts (metadata,
                       default config, packs), registry.ts (UI modules), RosterGate
  components/          App shell, header, board (dnd), widget frame & menu, library, dock,
                       Quick Find, settings, routine editor, engines (timers, reminders, shortcuts)
e2e/                   Playwright tests
```

## Data model (src/lib/types.ts)
Separated concepts: `Preferences`, `ClassRoom` (+ `Student` with stable ids, `StudentGroup`), `Workspace`
(ordered widget ids), `WidgetDefinition` (code only), `WidgetInstance` (id, type, color, lock, collapsed,
preferred size, **config**), widget **sessions** (`sessions[instanceId]`, transient running state),
`Favorite`, `QuickRoutine`, `DockItem`, `ClassRecords` (points, participation, picker rounds, rewards —
keyed by class), `SyncPreferences`.

Key rules this enforces:
- **Duplicate** = deep copy of config/color/size, new id, *no session* → a copied running timer starts fresh.
- **Remove** = `removedAt` timestamp; instance, config and class records stay → Undo / Restore. Permanent
  delete is a separate, confirmed action. Deleting a workspace moves its widgets to Removed.
- **One roster per class.** Student widgets read the active class; nothing copies student records.
- Class data is keyed by class id (and `classId:instanceId` for per-widget class data), so switching classes
  or workspaces never overwrites it.
- Spinner and Choice Picker options live in their own instance configs — editing one can't affect the other.

## Timers
`widgets/timer/timerLogic.ts` is a pure state machine based on absolute `endAt` timestamps (never tick
counting). One app-level `TimerEngine` finishes timers (sound, repeat, station rotation) even when the widget is
collapsed or in another workspace. On load, a timer that expired while the app was closed is marked done and is
**not** restarted. Each timer re-renders only itself while running.

## Animations whose result must match
The result is chosen first; the final transform is computed from it with `lib/geometry.ts`
(`dieRotationFor`, `spinnerRotationFor`, `coinRotationFor`). The inverse functions (`visibleDieFace`,
`segmentAtPointer`, `visibleCoinSide`) are unit-tested over hundreds of cases, and Playwright reads the
browser's actual computed transforms plus `elementFromPoint` hit-tests to verify what is visibly on top.
Buttons are disabled during an animation to prevent overlapping rolls/flips/spins.

## Microphone
`lib/micMeter.ts`: `getUserMedia` (echo cancellation / AGC off) → `MediaStreamSource` → `AnalyserNode`
(never connected to the speakers). RMS → relative 0–100 level (not calibrated dB), smoothed with fast
attack/slow release, drawn by writing a DOM style per animation frame (no React re-render at 60 fps).
`stop()` stops every track and closes the AudioContext; the widget releases the meter on unmount (with a
300 ms grace so moving to the expanded view doesn't re-prompt). Errors are mapped to friendly messages.

## Persistence
Debounced (300 ms) autosave of the persisted slice to IndexedDB, plus a flush on `visibilitychange/pagehide`.
Small display prefs are mirrored to localStorage to apply the theme before IndexedDB loads. Payloads are
versioned with a `migrate()` step; unreadable data is **backed up, never deleted**, and the app starts fresh
with a notice. With "session only" retention, student names and class records are stripped before writing.

## Actions, routines, dock, Quick Find
`store/actions.ts` holds every one-tap action. Widgets that animate (dice, coin, spinner, picker, choice)
receive *signals* and run their own animation, so the dock/Quick Find/routines produce the same visible result
as pressing the button. Quick Routines execute a fixed, predictable order of whitelisted actions and never
clear student records; each run is undoable. Quick Find uses a deterministic regex grammar
(`lib/commands.ts`) plus plain search — no AI interpretation.

## Responsive behaviour
Narrow-first CSS grid with container queries: preferred sizes (S/M/L) only widen cards when the board is wide
enough, so shrinking the window never overwrites saved sizes. Menus are portal popovers clamped to the
viewport. The shell uses `overflow: clip` so programmatic scrolling can't shift the header.

## Privacy
No network requests at runtime (no fonts/CDNs/analytics). Exported settings packs exclude rosters, records,
note text and uploaded pictures, and scrub any string equal to a student name. Cloud sync is intentionally
not implemented; `SyncPreferences` records choices for the future and `classRecords` is hard-wired to false.
