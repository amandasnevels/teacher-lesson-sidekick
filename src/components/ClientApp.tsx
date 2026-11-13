"use client";
import dynamic from "next/dynamic";

// The whole app is local-first and reads IndexedDB, so it renders on the client only.
const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center" role="status">
      <p className="animate-pulse text-lg font-bold text-ink-soft">Loading your Sidekick…</p>
    </div>
  ),
});

export default function ClientApp() {
  return <App />;
}
