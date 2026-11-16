"use client";
/**
 * The opening screen of every new visit, and the "switch workspace" chooser during a session.
 * A new visit shows nothing personal: no class, roster, notes or previous workspace.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Check, LogOut } from "lucide-react";
import { AccountBar } from "./Account";
import { useSidekick, persistedSnapshot } from "@/store/store";
import { useSelectValue } from "@/store/hooks";
import { WORKSPACE_PRESETS, type PresetKind } from "@/store/presets";
import { freshSession, sharedIdOf } from "@/store/workspaceLogic";
import { endSession, hasLegacyData, startSession } from "@/store/persist";
import { DEFINITIONS } from "@/widgets/definitions";
import { Button, Modal, cx, useConfirm } from "./ui";

/** Pastel accents per preset (hex so older Chromebooks render them too). */
const ACCENTS: Record<PresetKind, { bg: string; ring: string }> = {
  bryan: { bg: "#ede9ff", ring: "#7c6cf0" },
  wholeGroup: { bg: "#fff1e0", ring: "#f29a38" },
  centers: { bg: "#e3f6ec", ring: "#2bb673" },
  testing: { bg: "#e6f1ff", ring: "#2f80ed" },
  smallGroup: { bg: "#ffe8f3", ring: "#e05ba6" },
  management: { bg: "#fff8d6", ring: "#d9a400" },
  daily: { bg: "#e4f8fb", ring: "#1aa6b7" },
  transition: { bg: "#fde9e4", ring: "#e5674d" },
  custom: { bg: "#f3eefe", ring: "#9b51e0" },
};

export function WorkspaceChooser({ mode }: { mode: "welcome" | "switch" }) {
  const prefs = useSidekick((s) => s.prefs);
  const currentKind = useSidekick((s) => s.workspaces.find((w) => w.id === sharedIdOf(s, s.activeWorkspaceId))?.kind ?? null);
  const currentName = useSidekick((s) => s.workspaces.find((w) => w.id === sharedIdOf(s, s.activeWorkspaceId))?.name ?? "");
  const sessionKinds = useSelectValue((s) => s.workspaces.filter((w) => !w.baseId).map((w) => w.kind ?? null));
  const [tour, setTour] = useState(false);
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [confirmEl, ask] = useConfirm();
  const st = useSidekick.getState;

  useEffect(() => {
    if (mode === "welcome") void hasLegacyData().then(setLegacy);
  }, [mode]);
  useEffect(() => {
    if (mode !== "switch") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && st().closeChooser();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, st]);

  const choose = async (kind: PresetKind) => {
    if (busy) return;
    if (mode === "switch") {
      st().openPresetWorkspace(kind);
      return;
    }
    setBusy(true);
    const state = freshSession(kind, prefs);
    st().replaceAll(state);
    await startSession(persistedSnapshot());
    st().closeChooser();
    if (tour) st().setWalkthrough(true);
  };

  return (
    <div
      className={cx("h-screen-safe overflow-y-auto bg-bg", mode === "switch" && "fixed inset-0 z-40")}
      role={mode === "switch" ? "dialog" : "main"}
      aria-modal={mode === "switch" || undefined}
      aria-labelledby="chooser-title"
      data-testid="workspace-chooser"
      data-mode={mode}
    >
      {confirmEl}
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6">
        <AccountBar mode={mode} />
        {mode === "switch" && (
          <Button variant="outline" size="sm" onClick={() => st().closeChooser()} className="mb-3">
            <ArrowLeft size={16} /> Back to {currentName || "my workspace"}
          </Button>
        )}
        <header className="mb-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/teacher-sidekick-logo-wide.webp"
            alt="Teacher Sidekick by NevelLabs"
            width={798}
            height={160}
            className="mx-auto mb-4 h-auto w-full max-w-md object-contain"
          />
          <h1 id="chooser-title" className="text-2xl font-black sm:text-3xl">
            {mode === "welcome" ? "Welcome to Teacher Sidekick!" : "Choose a teaching workspace"}
          </h1>
          <p className="mx-auto mt-1 max-w-xl text-ink-soft">
            {mode === "welcome"
              ? "Your classroom tools, ready when you are. Choose a teaching workspace to get started."
              : "Switch tools anytime. Your classes and changes in this session are kept."}
          </p>
        </header>

        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr))]">
          {WORKSPACE_PRESETS.map((p) => {
            const a = ACCENTS[p.kind];
            const open = mode === "switch" && sessionKinds.includes(p.kind);
            const isCurrent = mode === "switch" && currentKind === p.kind;
            return (
              <li key={p.kind}>
                <article
                  className={cx("flex h-full flex-col rounded-3xl border-2 bg-card p-3.5 shadow-sm transition hover:shadow-md", isCurrent ? "border-brand" : "border-line")}
                  aria-labelledby={`preset-${p.kind}`}
                  data-testid={`preset-${p.kind}`}
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: a.bg, boxShadow: `inset 0 0 0 2px ${a.ring}33` }} aria-hidden>
                      {p.emoji}
                    </span>
                    <h2 id={`preset-${p.kind}`} className="text-lg font-black leading-tight">
                      {p.name}
                    </h2>
                  </div>
                  <p className="mb-2 text-sm text-ink-soft">{p.description}</p>
                  <ul className="mb-3 flex flex-wrap gap-1" aria-label={`Widgets in ${p.name}`}>
                    {p.widgets.map((w, i) => (
                      <li key={i} className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: a.bg, color: "#2a2f3a" }}>
                        {DEFINITIONS[w.type].emoji} {w.title ?? (w.config?.stations ? "Station Timer" : DEFINITIONS[w.type].name)}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <Button variant="primary" className="w-full" disabled={busy} onClick={() => void choose(p.kind)} aria-label={`Open ${p.name}`}>
                      {isCurrent ? <Check size={16} /> : null}
                      {isCurrent ? "Current workspace" : open ? `Go to ${p.name}` : `Open ${p.name}`}
                    </Button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        <footer className="mt-5 space-y-3 text-center text-sm text-ink-soft">
          {mode === "welcome" && (
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 font-semibold text-ink">
              <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={tour} onChange={(e) => setTour(e.target.checked)} />
              Show me a quick 4-step tour after I choose
            </label>
          )}
          <p>
            🔒 Your classes and changes stay in this browser tab while you teach, even if you refresh. A new visit starts fresh, and nothing is sent anywhere.
          </p>
          {mode === "welcome" && legacy && (
            <p data-testid="legacy-note">Data saved by an earlier version of Sidekick is still on this device. You can bring it back from Settings → Data after choosing a workspace.</p>
          )}
          {mode === "switch" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (await ask("End this session? Your classes, rosters and changes in this tab will be cleared, and Sidekick will start fresh.", "End session")) {
                  await endSession();
                  window.location.reload();
                }
              }}
            >
              <LogOut size={14} /> End session &amp; start fresh
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}

const STEPS = [
  { emoji: "🎓", title: "Active Class", body: "Add a class and paste your roster. Switching classes keeps your tools and asks which workspace you want." },
  { emoji: "🗂️", title: "Teaching Workspace", body: "Switch workspaces from the dropdown, make new ones, or tap the logo to come back to these presets." },
  { emoji: "🧩", title: "Widgets", body: "Drag a widget by ⠿ to move it, drag a corner to resize, and use ••• for size, settings and more." },
  { emoji: "🔒", title: "Saved in this tab", body: "Everything stays in this tab while you teach, even after a refresh. A new visit starts fresh." },
];

export function Walkthrough() {
  const open = useSidekick((s) => s.walkthrough);
  const [step, setStep] = useState(0);
  const close = () => useSidekick.getState().setWalkthrough(false);
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);
  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <Modal
      open
      onClose={close}
      title={`Quick tour · ${step + 1} of ${STEPS.length}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Skip
          </Button>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button variant="primary" onClick={() => (last ? close() : setStep(step + 1))}>
            {last ? "Start teaching" : "Next"}
          </Button>
        </>
      }
    >
      <div className="space-y-2 text-center" data-testid="walkthrough">
        <p className="text-5xl" aria-hidden>
          {s.emoji}
        </p>
        <h3 className="text-xl font-black">{s.title}</h3>
        <p className="text-ink-soft">{s.body}</p>
      </div>
    </Modal>
  );
}
