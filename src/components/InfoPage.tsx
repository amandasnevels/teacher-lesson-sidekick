/** Simple branded page shell for Privacy and Support (server-rendered, no app state). */
import type { ReactNode } from "react";

export const CONTACT_EMAIL = "hello@nevellabs.com";

export function InfoPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <main className="info-page min-h-screen bg-bg px-4 py-8 text-ink">
      <article className="info-card">
        <a href="/" className="info-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/teacher-sidekick-logo-wide.webp" alt="Teacher Sidekick by NevelLabs" width={798} height={160} className="h-auto w-64 max-w-full" />
        </a>
        <header>
          <h1>{title}</h1>
          {updated && <p className="info-updated">Last updated {updated}</p>}
        </header>
        {children}
        <footer>
          <a href="/">Open Teacher Sidekick</a> · <a href="/privacy">Privacy</a> · <a href="/support">Support</a>
        </footer>
      </article>
    </main>
  );
}
