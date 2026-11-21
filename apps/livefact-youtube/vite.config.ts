import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      input: {
        panel: fileURLToPath(new URL("./index.html", import.meta.url)),
        worker: fileURLToPath(new URL("./worker.ts", import.meta.url)),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
