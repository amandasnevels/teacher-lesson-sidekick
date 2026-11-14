# Feature checklist & known limitations

✅ implemented and working · 🧪 covered by automated tests · 🔜 planned / not implemented

## Foundation
- ✅ Narrow-first responsive shell (280 px → desktop), tablet/touch targets ≥ 40 px 🧪 (280/320/375/768/1280)
- ✅ Widget system: add, drag by handle (mouse/touch/keyboard), snap, lock/unlock, collapse, temporary expand,
  corner resizing (drag either bottom corner: width snaps to 1–4 grid columns, height in 8 px steps; arrow keys on
  the grip; double-click/Home resets height; disabled while locked; narrow windows never overwrite the saved size) 🧪, per-widget color, title, duplicate, favorite, remove + Undo, Removed Widgets restore,
  confirmed permanent delete, copy to another workspace 🧪
- ✅ More menu exactly: Duplicate · Save Favorite · Change Color · Lock/Unlock · Expand · Remove · More Settings (no Up/Down) 🧪
- ✅ Widget Library: search, categories, Favorites, Removed, Themed Packs, Recently used
- ✅ Workspaces (named presets; create, duplicate, rename, delete→Removed), classes independent, optional default workspace per class 🧪
- ✅ 8 themes (Rainbow, Bright & Bold, Pastel, Sunshine, Autumn, Winter, Spring, Dark); reduced-motion setting
- ✅ IndexedDB autosave + restore, versioned with backup on corruption 🧪

- ✅ "Keep Sidekick beside your lesson" guide: one-click **Open in its own window** (narrow, full height, right
  edge), drag-the-tab-out steps, Windows/Mac/Chromebook snapping, presenting tips; first-run card (dismissible,
  hidden in the pop-out and in already-narrow windows) and always available in Settings → General 🧪
- ✅ Single active window: if Sidekick is opened twice, the older window pauses saving so nothing is overwritten 🧪

## Day-one widgets
- ✅ Timer: start/pause/resume/reset, 1/3/5/10/15 + custom, +1 min, ring/bar/digits, color progress, end sounds,
  repeat, station rotation, mini view while collapsed, timestamp-accurate, refresh-safe 🧪
- ✅ Clock: 12/24 h, seconds, date, big/compact
- ✅ Class Roster Manager: multiple classes, manual add, paste, CSV import with preview/validation/duplicates,
  edit/remove, groups/tables, retention choice, delete class (confirmed), demo class 🧪
- ✅ Random Name Picker: animated, no repeats per round, manual Reset Round, “everyone picked” message,
  optional mark-participation 🧪
- ✅ Point Tracker: class / tables / students, ± adjustable values, categories, goal + celebration, undo,
  manual/daily/weekly reset, class-specific 🧪
- ✅ Participation: one-tap check, done/not-yet filters, “12 of 24”, new lesson reset, undo, class-specific 🧪
- ✅ Sticky Notes: autosave, colors, duplicate, class/general scope, favorites (style only), survives removal 🧪
- ✅ Checklists: add/edit/reorder/delete items, templates, daily + manual reset, class/general progress,
  undo, duplicate without progress
- ✅ Dice (1–3, 3D, result = visible face, no overlapping rolls, colors) 🧪
- ✅ Spinning Wheel (SVG, multi-turn deceleration, accurate pointer landing, editable 2–24 options) 🧪
- ✅ Choice Picker (separate lists, animated selection) 🧪
- ✅ Coin flip (3D, result = visible side, stats) 🧪
- ✅ Soundboard (5 original synthesized sounds, stop, volume, mute, favorites)
- ✅ Voice Level + live noise meter (permission flow, zones, sensitivity, thresholds, active indicator,
  stop releases tracks, unmount cleanup, error handling) 🧪 (incl. real fake-device browser test)

## Workflows
- ✅ Quick Dock: position top/bottom/left/right, pin actions/routines/favorites/widgets, reorder 🧪
- ✅ Quick Find with deterministic commands 🧪
- ✅ Quick Routines: 4 starters; create from template, from an action checklist, or from current setup; name/icon/color; undoable 🧪
- ✅ Global Undo (dock, shortcut, Quick Find) for routines, removals, point/roster changes
- ✅ Keyboard shortcuts (safe defaults, on/off toggle)
- ✅ Settings packs: export/import layouts, favorites, routines, theme — never student data 🧪

## Enhanced widgets
- ✅ Tally counter with goal · ✅ Reward Tracker (jar, stars, bar, puzzle, plant, creature, uploaded picture; per class)
- ✅ Group/partner maker (save as table groups) · ✅ Turn queue · ✅ Class status (custom) · ✅ Visual cues (editable)
- ✅ Schedule (current period, countdown, transition reminders) · ✅ Private reminders (once/daily/weekdays, audible/silent, period-linked)

## Known limitations
- The pop-out window's position and size are a request; some browsers or pop-up blockers ignore or block it
  (the guide then shows the manual steps).
- Data lives in one browser on one device; clearing site data deletes it. Use settings packs to back up
  layouts (student data intentionally isn't exportable yet).
- Cross-device sync, accounts and cloud storage are **not implemented** (choices are recorded only).
- Background tabs: browsers may delay timers in hidden tabs by up to ~1 minute after long inactivity; the
  remaining time is always correct, but an end sound may play late while the tab is hidden.
- Noise meter shows relative loudness; it is not a calibrated decibel meter. Mic stops when the Voice widget is
  collapsed, removed or another workspace is shown.
- Shortcut keys are fixed defaults (on/off only); a rebinding UI is planned.
- Only standard six-sided dice; the reward picture is stored locally (resized to 640 px).
- Automated tests run in Chromium only; Safari/Firefox and real touch devices were not tested in this environment.
- No offline service worker yet (the app works offline once loaded, but a refresh while offline won't load it).
- A full manual screen-reader audit has not been done; controls have labels, roles and visible focus.
