"use client";
import { useEffect, useState } from "react";
import { PanelRightOpen, X } from "lucide-react";
import { useSidekick } from "@/store/store";
import { isPopoutWindow, openSidekickWindow } from "@/lib/popout";
import { Button, IconButton } from "./ui";

/** Instructions + one-click pop-out for keeping Sidekick next to slides, Canva or a website. */
export function SideBySideGuide({ compact = false }: { compact?: boolean }) {
  const [blocked, setBlocked] = useState(false);
  const [showSteps, setShowSteps] = useState(!compact);
  const open = async () => {
    const ok = await openSidekickWindow();
    setBlocked(!ok);
    if (!ok) setShowSteps(true);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={open}>
          <PanelRightOpen size={18} /> Open in its own window
        </Button>
        {compact && (
          <Button variant="outline" onClick={() => setShowSteps((v) => !v)} aria-expanded={showSteps}>
            {showSteps ? "Hide steps" : "Show me how"}
          </Button>
        )}
      </div>
      {blocked && (
        <p role="alert" className="rounded-xl bg-[#fff5cc] px-3 py-2 text-sm font-semibold text-[#5c4300]">
          Your browser blocked the new window. Allow pop-ups for this site, or follow the steps below.
        </p>
      )}
      {showSteps && (
        <div className="space-y-3 text-sm">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              <b>Drag this browser tab out</b> of the tab bar and let go. It becomes its own window.
            </li>
            <li>
              <b>Make it narrow</b> by dragging the window’s left edge. Sidekick is designed to work at phone width.
            </li>
            <li>
              <b>Put it beside your lesson</b>: your slides, Canva or a website go in the other window.
            </li>
          </ol>
          <div className="rounded-xl bg-black/[.04] p-3 dark:bg-white/5">
            <p className="mb-1 font-bold">Snap the two windows side by side</p>
            <ul className="space-y-1">
              <li><b>Windows:</b> click the lesson window, press <kbd className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/15">⊞ Win</kbd> + <kbd className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/15">←</kbd>; then click Sidekick and press <kbd className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/15">⊞ Win</kbd> + <kbd className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/15">→</kbd>.</li>
              <li><b>Mac:</b> hover the green button in the window’s corner and choose a left/right tile.</li>
              <li><b>Chromebook:</b> <kbd className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/15">Alt</kbd> + <kbd className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/15">[</kbd> docks left, <kbd className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/15">Alt</kbd> + <kbd className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/15">]</kbd> docks right.</li>
            </ul>
          </div>
          <div className="rounded-xl bg-black/[.04] p-3 dark:bg-white/5">
            <p className="mb-1 font-bold">Presenting to students?</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Full-screen slideshows cover everything. In Google Slides choose <b>Slideshow → Presenter view</b> or present in a window; in PowerPoint use <b>Browsed by an individual (window)</b>.</li>
              <li>When screen-sharing or casting, share <b>only the lesson window</b> so Sidekick stays private to you, or share Sidekick on purpose to show a timer or voice level.</li>
            </ul>
          </div>
          <p className="text-xs text-ink-soft">Your tools and settings are the same in every window. If Sidekick is open twice, the older window pauses so nothing gets overwritten.</p>
        </div>
      )}
    </div>
  );
}

/** First-run card at the top of the workspace. Hidden once dismissed, in the pop-out window, or when already narrow. */
export function SideBySideBanner() {
  const dismissed = useSidekick((s) => s.prefs.sideBySideTipDismissed);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const check = () => setWide(window.innerWidth > 560);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  if (dismissed || !wide || isPopoutWindow()) return null;
  return (
    <section aria-labelledby="sbs-title" className="pop-in relative mb-3 rounded-3xl border-2 border-dashed border-brand/50 bg-card p-4 shadow-sm" data-testid="side-by-side-tip">
      <IconButton label="Dismiss tip" className="absolute right-2 top-2" onClick={() => useSidekick.getState().setPrefs({ sideBySideTipDismissed: true })}>
        <X size={18} />
      </IconButton>
      <div className="flex items-start gap-3 pr-10">
        <span className="text-3xl" aria-hidden>🪟</span>
        <div className="min-w-0 space-y-1">
          <h2 id="sbs-title" className="text-lg font-black">Keep Sidekick beside your lesson</h2>
          <p className="text-sm text-ink-soft">
            Sidekick works best as a narrow window next to your slides, Canva or a website, so your tools stay one tap away while you teach.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <SideBySideGuide compact />
      </div>
      <p className="mt-2 text-xs text-ink-soft">You can find this again in Settings → General.</p>
    </section>
  );
}
