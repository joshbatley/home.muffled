import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import { createMfSharedOptions, mfDedupe } from "../lib/mf-shared";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "..");

// Dev defaults to the local users remote; prod sets VITE_USERS_REMOTE_ENTRY
// to the deployed remoteEntry.js (e.g. https://users.example.com/remoteEntry.js).
const usersRemoteEntry =
  process.env.VITE_USERS_REMOTE_ENTRY ?? "http://localhost:5174/remoteEntry.js";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(appDir, "./src"),
    },
    dedupe: [...mfDedupe],
  },
  esbuild: {
    target: "chrome89",
  },
  optimizeDeps: {
    include: ["@supabase/supabase-js"],
    esbuildOptions: {
      target: "chrome89",
    },
  },
  plugins: [
    federation({
      dts: false,
      dev: { disableDynamicRemoteTypeHints: true, remoteHmr: false },
      name: "portalHost",
      filename: "remoteEntry.js",
      exposes: {},
      remotes: {
        usersRemote: {
          type: "module",
          name: "usersRemote",
          entry: usersRemoteEntry,
          entryGlobalName: "usersRemote",
          shareScope: "default",
        },
      },
      shared: createMfSharedOptions(appDir, "host"),
    }),
    react({ exclude: [/lib\/auth\/dist/] }),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    origin: "http://localhost:5173",
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
  build: {
    target: "chrome89",
  },
});
