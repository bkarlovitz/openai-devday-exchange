import { copyFile, mkdir, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
await copyFile(path.join(root, "manifest.json"), path.join(root, "dist/manifest.json"));
const licenses = path.join(root, "dist/licenses");
await mkdir(licenses, { recursive: true });
const fonts = path.join(root, "../../packages/ui/fonts");
for (const name of await readdir(fonts)) {
  if (name.endsWith("-OFL.txt")) await copyFile(path.join(fonts, name), path.join(licenses, name));
}
const output = path.join(root, "../../dist");
await mkdir(output, { recursive: true });
execFileSync("python3", [
  "-c",
  "import shutil,sys; shutil.make_archive(sys.argv[1], 'zip', sys.argv[2])",
  path.join(output, "council-check-extension"),
  path.join(root, "dist"),
]);
console.log("Unpacked extension: apps/extension/dist");
console.log("Archive: dist/council-check-extension.zip");
