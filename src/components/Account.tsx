"use client";
/**
 * Teacher accounts: Log in / Create account, and saving or opening a teacher's setup.
 * Passwords go straight to the account service (Supabase); this app never stores them.
 * Only a student-free settings pack is saved to the account.
 */
import { useEffect, useState } from "react";
import { CloudDownload, CloudUpload, Eye, EyeOff, LogIn, LogOut, UserPlus } from "lucide-react";
import { accountsEnabled, currentUser, loadSetup, logIn, logOut, onAuthChange, saveSetup, sendPasswordReset, signUp, type AccountUser } from "@/lib/account";
import { buildSettingsPack } from "@/lib/exportPack";
import { persistedSnapshot, useSidekick } from "@/store/store";
import { startSession } from "@/store/persist";
import { mergeSetup, sessionFromSetup } from "@/store/accountActions";
import { Button, Modal, cx, inputCls } from "./ui";

export function useAccount() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [ready, setReady] = useState(!accountsEnabled());
  useEffect(() => {
    if (!accountsEnabled()) return;
    let stop = () => {};
    void currentUser().then((u) => {
      setUser(u);
      setReady(true);
    });
    void onAuthChange(setUser).then((s) => (stop = s));
    return () => stop();
  }, []);
  return { user, ready, enabled: accountsEnabled() };
}

/** Save this session's setup (no student data) to the signed-in teacher's account. */
export async function saveMySetup(): Promise<string> {
  await saveSetup(buildSettingsPack(persistedSnapshot()));
  return "Saved to your account. Student names and class records stay on this computer.";
}

/** Welcome screen / main menu: account buttons and saved-setup actions. */
export function AccountBar({ mode }: { mode: "welcome" | "switch" }) {
  const { user, ready, enabled } = useAccount();
  const [dialog, setDialog] = useState<null | "login" | "create">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openSaved = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const saved = await loadSetup();
      if (!saved) {
        setMsg("You haven't saved a setup yet. Choose a workspace, make it yours, then use “Save my setup”.");
        return;
      }
      const st = useSidekick.getState();
      if (mode === "welcome") {
        const state = sessionFromSetup(saved.pack, st.prefs);
        st.replaceAll(state);
        await startSession(persistedSnapshot());
        st.closeChooser();
      } else {
        useSidekick.setState(mergeSetup(persistedSnapshot(), saved.pack));
        st.closeChooser();
        st.toast({ message: "Your saved workspaces were added to the Teaching Workspace list.", tone: "success" });
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) return <ComingSoon />;
  if (!ready) return <div className="mb-2 h-9" />;
  return (
    <div className="mb-2 space-y-1" data-testid="account-bar">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {user ? (
          <>
            <span className="truncate text-sm font-semibold text-ink-soft" data-testid="account-email">
              Signed in as {user.email}
            </span>
            <Button variant="primary" size="sm" onClick={() => void openSaved()} disabled={busy}>
              <CloudDownload size={16} /> {mode === "welcome" ? "Open my saved setup" : "Add my saved workspaces"}
            </Button>
            {mode === "switch" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    setMsg(await saveMySetup());
                  } catch (e) {
                    setMsg((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <CloudUpload size={16} /> Save my setup
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => void logOut()}>
              <LogOut size={16} /> Log out
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setDialog("login")}>
              <LogIn size={16} /> Log in
            </Button>
            <Button variant="primary" size="sm" onClick={() => setDialog("create")}>
              <UserPlus size={16} /> Create account
            </Button>
          </>
        )}
      </div>
      {msg && (
        <p className="text-right text-sm font-semibold" role="status">
          {msg}
        </p>
      )}
      {dialog && <AuthDialog initial={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

function AuthDialog({ initial, onClose }: { initial: "login" | "create"; onClose: () => void }) {
  const [tab, setTab] = useState(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      if (tab === "create") {
        const r = await signUp(email, password);
        if (r.needsConfirm) setInfo("Almost done! We sent a confirmation link to your email. Click it, then log in here.");
        else onClose();
      } else {
        await logIn(email, password);
        onClose();
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={tab === "create" ? "Create your free account" : "Log in"}>
      <form
        className="space-y-3"
        data-testid="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-soft p-1">
          {(["login", "create"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t);
                setErr(null);
                setInfo(null);
              }}
              className={cx("min-h-9 rounded-lg text-sm font-extrabold", tab === t ? "bg-card shadow-sm" : "text-ink-soft")}
            >
              {t === "login" ? "Log in" : "Create account"}
            </button>
          ))}
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-bold">Email</span>
          <input className={inputCls} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-bold">Password</span>
          <span className="flex gap-1.5">
            <input
              className={inputCls}
              type={show ? "text" : "password"}
              autoComplete={tab === "create" ? "new-password" : "current-password"}
              required
              minLength={tab === "create" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="shrink-0 rounded-xl px-2 text-ink-soft hover:bg-soft" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
          {tab === "create" && <span className="block text-xs text-ink-soft">At least 8 characters. Use a password you don&rsquo;t use anywhere else.</span>}
        </label>
        {err && (
          <p className="text-sm font-bold text-[#d93036]" role="alert">
            {err}
          </p>
        )}
        {info && (
          <p className="rounded-xl bg-[#e3f6ec] px-3 py-2 text-sm font-semibold text-[#0f5132]" role="status">
            {info}
          </p>
        )}
        <Button type="submit" variant="primary" className="w-full" disabled={busy || !email || !password}>
          {busy ? "Please wait…" : tab === "create" ? "Create account" : "Log in"}
        </Button>
        {tab === "login" && (
          <button
            type="button"
            className="w-full text-center text-sm font-bold underline"
            onClick={async () => {
              if (!email) return setErr("Type your email above, then tap “Forgot password?” again.");
              try {
                await sendPasswordReset(email);
                setInfo("Check your email for a link to reset your password.");
              } catch (e) {
                setErr((e as Error).message);
              }
            }}
          >
            Forgot password?
          </button>
        )}
        <p className="text-xs text-ink-soft">
          Your account saves your workspaces, layouts, favorites and theme. Student names and class records always stay on this computer.
        </p>
      </form>
    </Modal>
  );
}

/** Shown while accounts aren't connected: honest, collects nothing. */
function ComingSoon() {
  const [open, setOpen] = useState<null | "login" | "create">(null);
  return (
    <div className="mb-2 flex justify-end gap-2" data-testid="account-buttons">
      <Button variant="outline" size="sm" onClick={() => setOpen("login")}>
        <LogIn size={16} /> Log in
      </Button>
      <Button variant="primary" size="sm" onClick={() => setOpen("create")}>
        <UserPlus size={16} /> Create account
      </Button>
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open === "create" ? "Create a free account" : "Log in"}
        footer={
          <Button variant="primary" onClick={() => setOpen(null)}>
            Got it — start teaching
          </Button>
        }
      >
        <div className="space-y-3 text-sm" data-testid="account-coming-soon">
          <p className="text-4xl" aria-hidden>
            🔐
          </p>
          <p className="text-base font-bold">Teacher accounts are coming soon.</p>
          <p>With an account you&rsquo;ll be able to sign in and keep your favorite workspaces, layouts and settings on any computer.</p>
          <p className="text-ink-soft">
            You don&rsquo;t need an account to use Sidekick. Your classes and changes stay in this browser tab while you teach, and student information is never sent anywhere.
          </p>
        </div>
      </Modal>
    </div>
  );
}
