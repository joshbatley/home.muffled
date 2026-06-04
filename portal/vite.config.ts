import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { usersWorkspaceAlias } from "../lib/vite-users-alias";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "..");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(appDir, "./src"),
      "@home/users": path.resolve(repoRoot, "users/src"),
      "@home/auth": path.resolve(repoRoot, "lib/auth/src/index.ts"),
      react: path.resolve(appDir, "node_modules/react"),
      "react-dom": path.resolve(appDir, "node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  plugins: [react(), tailwindcss(), usersWorkspaceAlias(repoRoot)],
  server: {
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    target: "esnext",
  },
});
