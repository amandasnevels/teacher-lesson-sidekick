import type { Metadata, Viewport } from "next";
import "react-grid-layout/css/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teacher Lesson Sidekick",
  description: "Your classroom tools. Your layout. Your teaching flow.",
  applicationName: "Teacher Lesson Sidekick",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5b5bd6",
};

/** Applies the saved theme before first paint to avoid a flash of the default theme. */
const themeBoot = `try{var p=JSON.parse(localStorage.getItem('sidekick-prefs')||'null');if(p&&p.themeId){document.documentElement.dataset.bootTheme=p.themeId;if(p.themeId==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.setProperty('--bg','#121520');}}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
