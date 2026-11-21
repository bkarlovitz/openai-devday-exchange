import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyFile, mkdir } from "node:fs/promises";
const downloads = new URL("../apps/web/public/downloads/", import.meta.url);
await mkdir(downloads, { recursive: true });
await copyFile(
  new URL("../dist/council-check-extension.zip", import.meta.url),
  new URL("council-check-extension.zip", downloads),
);
console.log("Extension download prepared for the web deployment.");

execFileSync("python3", [
  "-c",
  "import shutil,sys; shutil.make_archive(sys.argv[1], 'zip', sys.argv[2])",
  fileURLToPath(new URL("../dist/livefact-youtube", import.meta.url)),
  fileURLToPath(new URL("../apps/livefact-youtube/dist/", import.meta.url)),
]);
await copyFile(
  new URL("../dist/livefact-youtube.zip", import.meta.url),
  new URL("livefact-youtube.zip", downloads),
);
console.log("LiveFact YouTube extension download prepared.");
