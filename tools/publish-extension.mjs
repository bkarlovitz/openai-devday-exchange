import { copyFile, mkdir } from "node:fs/promises";
const downloads = new URL("../apps/web/public/downloads/", import.meta.url);
await mkdir(downloads, { recursive: true });
await copyFile(
  new URL("../dist/council-check-extension.zip", import.meta.url),
  new URL("council-check-extension.zip", downloads),
);
console.log("Extension download prepared for the web deployment.");
