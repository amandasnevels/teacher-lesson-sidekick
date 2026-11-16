/**
 * Optional teacher accounts (Supabase). Off until NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set (both are public by design; access is protected by
 * row-level security, see supabase/schema.sql).
 *
 * Only a settings pack is stored in the cloud: workspaces, widget settings, favorites, routines
 * and theme — the same filtered data as "Export settings pack". Student names, rosters and class
 * records never leave the device. Passwords are handled by Supabase (never by this app's code).
 */
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { SettingsPack } from "./exportPack";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const accountsEnabled = () => !!(URL_ && KEY);

let client: Promise<SupabaseClient> | null = null;
function sb(): Promise<SupabaseClient> {
  if (!accountsEnabled()) return Promise.reject(new Error("Accounts aren't set up yet."));
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "sidekick-auth" } }),
  );
  return client;
}

export interface AccountUser {
  id: string;
  email: string;
}
const toUser = (s: Session | null): AccountUser | null => (s?.user ? { id: s.user.id, email: s.user.email ?? "" } : null);

const friendly = (msg: string) =>
  /invalid login/i.test(msg)
    ? "That email and password don't match. Try again or reset your password."
    : /email not confirmed/i.test(msg)
      ? "Please confirm your email first — check your inbox for the link."
      : /already registered/i.test(msg)
        ? "There's already an account with that email. Try logging in."
        : /password/i.test(msg) && /6|short|weak/i.test(msg)
          ? "Please choose a longer password (at least 8 characters)."
          : msg;

export async function currentUser(): Promise<AccountUser | null> {
  if (!accountsEnabled()) return null;
  const { data } = await (await sb()).auth.getSession();
  return toUser(data.session);
}

export async function onAuthChange(cb: (u: AccountUser | null) => void): Promise<() => void> {
  if (!accountsEnabled()) return () => {};
  const { data } = (await sb()).auth.onAuthStateChange((_e, s) => cb(toUser(s)));
  return () => data.subscription.unsubscribe();
}

export async function signUp(email: string, password: string): Promise<{ needsConfirm: boolean }> {
  if (password.length < 8) throw new Error("Please choose a longer password (at least 8 characters).");
  const { data, error } = await (await sb()).auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
  if (error) throw new Error(friendly(error.message));
  return { needsConfirm: !data.session };
}

export async function logIn(email: string, password: string): Promise<AccountUser> {
  const { data, error } = await (await sb()).auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
  return toUser(data.session)!;
}

export async function logOut() {
  await (await sb()).auth.signOut();
}

export async function sendPasswordReset(email: string) {
  const { error } = await (await sb()).auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
  if (error) throw new Error(friendly(error.message));
}

/** Save the teacher's setup (a student-free settings pack) to their account. */
export async function saveSetup(pack: SettingsPack): Promise<void> {
  const c = await sb();
  const { data } = await c.auth.getSession();
  if (!data.session) throw new Error("Please log in first.");
  const { error } = await c.from("teacher_settings").upsert({ user_id: data.session.user.id, pack, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function loadSetup(): Promise<{ pack: SettingsPack; updatedAt: string } | null> {
  const c = await sb();
  const { data: s } = await c.auth.getSession();
  if (!s.session) return null;
  const { data, error } = await c.from("teacher_settings").select("pack, updated_at").eq("user_id", s.session.user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { pack: data.pack as SettingsPack, updatedAt: data.updated_at as string } : null;
}
