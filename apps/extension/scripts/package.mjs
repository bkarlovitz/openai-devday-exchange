import { copyFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
await copyFile(path.join(root, "manifest.json"), path.join(root, "dist/manifest.json"));
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
