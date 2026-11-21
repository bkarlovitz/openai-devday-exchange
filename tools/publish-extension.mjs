import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyFile, mkdir, readdir } from "node:fs/promises";
const downloads = new URL("../apps/web/public/downloads/", import.meta.url);
await mkdir(downloads, { recursive: true });
await copyFile(
  new URL("../dist/council-check-extension.zip", import.meta.url),
  new URL("council-check-extension.zip", downloads),
);
console.log("Extension download prepared for the web deployment.");

const fonts = new URL("../packages/ui/fonts/", import.meta.url);
const licenses = (await readdir(fonts)).filter((name) => name.endsWith("-OFL.txt"));
for (const directory of [
  new URL("../apps/livefact-youtube/dist/licenses/", import.meta.url),
  new URL("../apps/web/public/licenses/fonts/", import.meta.url),
]) {
  await mkdir(directory, { recursive: true });
  for (const name of licenses) await copyFile(new URL(name, fonts), new URL(name, directory));
}
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
