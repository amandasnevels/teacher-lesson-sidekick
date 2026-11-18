"use client";
/**
 * "Download Sidekick": install it as an app that opens in its own window and works offline.
 * Uses the browser's install prompt where available (Chrome, Edge, Chromebooks); otherwise shows
 * the two-tap steps (Safari / iPad: Share → Add to Home Screen).
 */
import { useEffect, useState } from "react";
import { CheckCircle2, Download, WifiOff } from "lucide-react";
import { Button, cx } from "./ui";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
declare global {
  interface Window {
    __sidekickInstall?: InstallPromptEvent | null;
  }
}

const isStandalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

export function useInstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(() => (typeof window !== "undefined" ? window.__sidekickInstall ?? null : null));
  const [installed, setInstalled] = useState(isStandalone);
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__sidekickInstall = e as InstallPromptEvent;
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // An active service worker means the app has been saved for offline use.
    void navigator.serviceWorker?.ready.then(() => setOfflineReady(true)).catch(() => {});
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const install = async () => {
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    window.__sidekickInstall = null;
    setPrompt(null);
    if (outcome === "accepted") setInstalled(true);
    return outcome === "accepted";
  };
  return { canPrompt: !!prompt, installed, offlineReady, install };
}

export function InstallCard({ compact }: { compact?: boolean }) {
  const { canPrompt, installed, offlineReady, install } = useInstallApp();
  const [help, setHelp] = useState(false);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const apple = /iPad|iPhone|Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|Edg/.test(ua);

  return (
    <div className={cx("rounded-2xl border-2 border-line bg-card text-left", compact ? "p-3" : "mx-auto max-w-xl p-4")} data-testid="install-card">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-3xl" aria-hidden>
          💻
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-ink">{installed ? "Sidekick is installed" : "Download Sidekick — works offline"}</p>
          <p className="text-sm text-ink-soft">
            {installed
              ? "Open it from your apps, dock or home screen — no internet needed."
              : "Install it as an app on this computer. It opens in its own window and keeps working without internet."}
          </p>
        </div>
        {!installed &&
          (canPrompt ? (
            <Button variant="primary" onClick={() => void install()}>
              <Download size={16} /> Install app
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setHelp(!help)} aria-expanded={help}>
              <Download size={16} /> How to install
            </Button>
          ))}
      </div>
      {help && !installed && (
        <ol className="mt-3 list-decimal space-y-1 pl-6 text-sm" data-testid="install-steps">
          {apple ? (
            <>
              <li>
                Tap the <b>Share</b> button (square with an arrow).
              </li>
              <li>
                Choose <b>Add to Home Screen</b> (iPad) or <b>Add to Dock</b> (Mac), then <b>Add</b>.
              </li>
            </>
          ) : (
            <>
              <li>
                In Chrome or Edge, click the <b>install icon</b> at the right end of the address bar, or open the <b>⋮</b> menu.
              </li>
              <li>
                Choose <b>Install Teacher Sidekick</b> (Chrome: <i>Cast, save, and share → Install page as app</i>).
              </li>
            </>
          )}
          <li>Open Sidekick once while online. After that it works anywhere — even with no internet.</li>
        </ol>
      )}
      <p className={cx("mt-2 flex items-center gap-1.5 text-xs font-bold", offlineReady ? "text-[#1d7f4f]" : "text-ink-soft")} data-testid="offline-status">
        {offlineReady ? <CheckCircle2 size={14} /> : <WifiOff size={14} />}
        {offlineReady ? "Saved on this computer — ready to use offline" : "Getting ready for offline use…"}
      </p>
    </div>
  );
}
