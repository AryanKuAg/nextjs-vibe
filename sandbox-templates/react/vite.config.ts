// Copied into the sandbox image by e2b.Dockerfile, replacing the vite.config.ts
// that `npm create vite` generates. It lives in a real file rather than an
// inlined `echo` because the E2B v2 builder strips backslashes from RUN
// commands, which silently turned every "\n" into a literal "n".
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  server: { allowedHosts: true },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
