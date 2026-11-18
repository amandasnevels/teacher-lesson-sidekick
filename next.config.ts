import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/** Every file in public/ (CHAMPS cards, logo, icons, anchor charts) so pictures work offline too. */
function publicFiles(dir = "public", base = ""): { url: string; revision: string }[] {
  return readdirSync(path.join(dir, base)).flatMap((name) => {
    const rel = path.posix.join(base, name);
    const full = path.join(dir, rel);
    if (statSync(full).isDirectory()) return publicFiles(dir, rel);
    if (/^(sw\.js(\.map)?|swe-worker-.*\.js)$/.test(name)) return [];
    return [{ url: `/${rel}`, revision: createHash("md5").update(readFileSync(full)).digest("hex") }];
  });
}

// Offline support: precache the app shell, every build chunk and everything in public/.
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? `${Date.now()}`;
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // (Giving our own list replaces Serwist's public/ scan, so public files are listed here too.)
  additionalPrecacheEntries: [{ url: "/", revision }, ...publicFiles()],
  // TEKS data is a few MB; let it be saved for offline use.
  maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          // Microphone is only allowed for this origin (Voice Level widget).
          { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
        ],
      },
      // Always check for a newer version of the offline worker.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default withSerwist(nextConfig);
