import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Builds the create-dialog code into static/uim/dist, the Custom UI resource in manifest.yml.
// Relative base: Forge serves the resource from its own path.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  build: { outDir: "dist", emptyOutDir: true },
});
