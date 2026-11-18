/**
 * Teacher Sidekick for Mac (Electron). Serves the offline copy of the web app (desktop/app,
 * built with `SIDEKICK_DESKTOP=1 next build`) from a private app:// address, so everything works
 * with no internet. Teaching data stays in this Mac's app storage, like the website.
 */
const { app, BrowserWindow, protocol, net, shell, session } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");

const ROOT = path.join(__dirname, "app");
const ORIGIN = "app://sidekick";

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

function fileFor(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const candidate = path.normalize(path.join(ROOT, clean || "index.html"));
  if (!candidate.startsWith(ROOT)) return path.join(ROOT, "index.html");
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  if (fs.existsSync(candidate + ".html")) return candidate + ".html";
  return path.join(ROOT, "index.html");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 320,
    title: "Teacher Sidekick",
    backgroundColor: "#f6f4ff",
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true },
  });
  win.loadURL(`${ORIGIN}/`);
  // Same-app windows (e.g. "Open in its own window") stay in the app; web links open in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(ORIGIN)) return { action: "allow", overrideBrowserWindowOptions: { width: 420, height: 900 } };
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(ORIGIN)) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  protocol.handle("app", (req) => net.fetch(pathToFileURL(fileFor(new URL(req.url).pathname)).toString()));
  // Microphone for the Voice Level widget (macOS still asks the teacher the first time).
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "media" || permission === "clipboard-sanitized-write"));
  createWindow();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
