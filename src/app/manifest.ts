import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** Lets teachers install Sidekick as an app that opens in its own window and works offline. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Teacher Sidekick by NevelLabs",
    short_name: "Sidekick",
    description: "Classroom tools that work offline: timers, expectations, voice level, name picker and more.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f4ff",
    theme_color: "#5b5bd6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
