/**
 * Builds the Mac App Store version of Teacher Sidekick: one universal app (Apple Silicon + Intel),
 * sandboxed, signed with the "3rd Party Mac Developer" / Apple Distribution certificate and the
 * "Sidekick Mac App Store" provisioning profile, then wrapped in a signed installer package
 * (dist-mas/Teacher-Sidekick-App-Store.pkg) ready to upload to App Store Connect.
 *
 * Needs (set by the "Mac App Store" GitHub workflow):
 *   MAS_APP_IDENTITY        e.g. "3rd Party Mac Developer Application: … (TEAMID)"
 *   MAS_INSTALLER_IDENTITY  e.g. "3rd Party Mac Developer Installer: … (TEAMID)"
 *   MAS_PROVISION_PROFILE_PATH
 *   MAS_BUILD_NUMBER        increases with every upload (Apple requires a new one each time)
 */
const { packager } = require("@electron/packager");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const pkg = require("./package.json");

const ELECTRON = "45.2.1";
const TEAM_ID = "4MMHU7YQ72";
const { MAS_APP_IDENTITY, MAS_INSTALLER_IDENTITY, MAS_PROVISION_PROFILE_PATH } = process.env;
const BUILD = process.env.MAS_BUILD_NUMBER || "1";
if (!MAS_APP_IDENTITY || !MAS_INSTALLER_IDENTITY || !MAS_PROVISION_PROFILE_PATH) {
  console.error("Missing MAS_APP_IDENTITY, MAS_INSTALLER_IDENTITY or MAS_PROVISION_PROFILE_PATH.");
  process.exit(1);
}
const parent = path.join(__dirname, "entitlements.mas.plist");
const child = path.join(__dirname, "entitlements.mas.child.plist");
const out = path.join(__dirname, "dist-mas");

(async () => {
  const [dir] = await packager({
    dir: __dirname,
    name: "Teacher Sidekick",
    executableName: "Teacher Sidekick",
    appBundleId: "com.nevellabs.sidekick",
    appCategoryType: "public.app-category.education",
    appCopyright: "© NevelLabs",
    appVersion: pkg.version,
    buildVersion: BUILD,
    platform: "mas",
    arch: "universal",
    electronVersion: ELECTRON,
    icon: path.join(__dirname, "icon.icns"),
    out,
    overwrite: true,
    prune: true,
    ignore: [/^\/dist(-mas)?($|\/)/, /^\/node_modules($|\/)/, /^\/package-ma[cs]\.js$/, /^\/icon\.png$/, /^\/entitlements.*\.plist$/],
    osxSign: {
      identity: MAS_APP_IDENTITY,
      platform: "mas",
      type: "distribution",
      provisioningProfile: MAS_PROVISION_PROFILE_PATH,
      // The app itself gets the sandbox + permissions; helpers and frameworks inherit them.
      optionsForFile: (file) => ({ hardenedRuntime: false, entitlements: file.endsWith("Teacher Sidekick.app") ? parent : child }),
    },
    extendInfo: {
      ElectronTeamID: TEAM_ID,
      ITSAppUsesNonExemptEncryption: false,
      LSMinimumSystemVersion: "12.0",
      NSMicrophoneUsageDescription: "Teacher Sidekick uses the microphone only for the Voice Level meter, and only when you turn it on.",
    },
  });
  const app = path.join(dir, "Teacher Sidekick.app");
  const pkgFile = path.join(out, "Teacher-Sidekick-App-Store.pkg");
  execFileSync("rm", ["-f", pkgFile]);
  execFileSync("productbuild", ["--component", app, "/Applications", "--sign", MAS_INSTALLER_IDENTITY, pkgFile], { stdio: "inherit" });
  console.log("built", pkgFile, "version", pkg.version, "build", BUILD);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
