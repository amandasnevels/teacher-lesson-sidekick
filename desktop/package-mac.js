/** Builds Teacher Sidekick.app for Apple Silicon and Intel Macs, zipped (symlinks kept). */
const { packager } = require("@electron/packager");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const ELECTRON = "45.2.1";
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
      ignore: [/^\/dist($|\/)/, /^\/node_modules($|\/)/, /^\/package-mac\.js$/, /^\/icon\.png$/],
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
