/**
 * Builds Teacher Sidekick.app for Apple Silicon and Intel Macs, zipped (symlinks kept).
 * On a Mac with a Developer ID certificate in the keychain and APPLE_API_KEY_PATH /
 * APPLE_API_KEY_ID / APPLE_API_ISSUER set, the app is signed and notarized by Apple
 * (opens with a normal double-click). Otherwise it is left unsigned.
 */
const { packager } = require("@electron/packager");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const ELECTRON = "45.2.1";
const identity = process.env.MAC_SIGN_IDENTITY;
const notarize =
  process.env.APPLE_API_KEY_PATH && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER
    ? { appleApiKey: process.env.APPLE_API_KEY_PATH, appleApiKeyId: process.env.APPLE_API_KEY_ID, appleApiIssuer: process.env.APPLE_API_ISSUER }
    : undefined;
const entitlements = path.join(__dirname, "entitlements.mac.plist");
(async () => {
  for (const arch of ["arm64", "x64"]) {
    const [dir] = await packager({
      dir: __dirname,
      name: "Teacher Sidekick",
      executableName: "Teacher Sidekick",
      appBundleId: "com.nevellabs.sidekick",
      appCategoryType: "public.app-category.education",
      appCopyright: "© NevelLabs",
      platform: "darwin",
      arch,
      electronVersion: ELECTRON,
      icon: path.join(__dirname, "icon.icns"),
      out: path.join(__dirname, "dist"),
      overwrite: true,
      prune: true,
      ignore: [/^\/dist($|\/)/, /^\/node_modules($|\/)/, /^\/dist-mas($|\/)/, /^\/package-ma[cs]\.js$/, /^\/icon\.png$/, /^\/entitlements.*\.plist$/],
      ...(identity
        ? {
            osxSign: { identity, optionsForFile: () => ({ hardenedRuntime: true, entitlements }) },
            ...(notarize ? { osxNotarize: notarize } : {}),
          }
        : {}),
      extendInfo: {
        NSMicrophoneUsageDescription: "Teacher Sidekick uses the microphone only for the Voice Level meter, and only when you turn it on.",
      },
    });
    const zip = path.join(__dirname, "dist", `Teacher-Sidekick-Mac-${arch === "arm64" ? "Apple-Silicon" : "Intel"}.zip`);
    execFileSync("rm", ["-f", zip]);
    execFileSync("zip", ["-qry", zip, "Teacher Sidekick.app"], { cwd: dir });
    console.log("built", zip);
  }
})();
