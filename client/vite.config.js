import { defineConfig } from "vite";

export default defineConfig({
  base: "/client/",
  server: {
    port: 5173,
    strictPort: true
  }
});
