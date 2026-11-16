/** Bringing a saved (student-free) setup from the teacher's account into the current session. */
import type { PersistedState } from "@/lib/types";
import { importSettingsPack, type SettingsPack } from "@/lib/exportPack";
import type { ThemeId } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { ensureAllRequired, freshSession, switchTo } from "./workspaceLogic";

/**
 * A new session built from a saved setup: its workspaces, favorites, routines and theme.
 * Classes and student records are not part of a setup and start empty.
 */
export function sessionFromSetup(pack: SettingsPack, prefs: PersistedState["prefs"]): PersistedState {
  const data = importSettingsPack(pack);
  const base = freshSession("custom", prefs);
  if (!data.workspaces.length) return base;
  const theme = THEMES.some((t) => t.id === data.theme) ? (data.theme as ThemeId) : prefs.themeId;
  let s: PersistedState = {
    ...base,
    prefs: { ...base.prefs, themeId: theme },
    workspaces: data.workspaces,
    widgets: data.widgets,
    favorites: data.favorites,
    routines: data.routines.length ? data.routines : base.routines,
    activeWorkspaceId: "",
  };
  s = ensureAllRequired(s);
  return switchTo(s, s.workspaces[0].id);
}

/** During a session: add the saved workspaces (and favorites/routines) next to the current ones. */
export function mergeSetup(s: PersistedState, pack: SettingsPack): PersistedState {
  const data = importSettingsPack(pack);
  return ensureAllRequired({
    ...s,
    workspaces: [...s.workspaces, ...data.workspaces],
    widgets: { ...s.widgets, ...data.widgets },
    favorites: [...s.favorites, ...data.favorites],
    routines: [...s.routines, ...data.routines],
  });
}
