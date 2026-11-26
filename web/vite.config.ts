import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// The API runs in the Worker (`npm run dev:api`, port 8787); Vite proxies /api to it.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [vue()],
  build: { outDir: "dist", emptyOutDir: true },
  server: { proxy: { "/api": "http://localhost:8787" } },
});
