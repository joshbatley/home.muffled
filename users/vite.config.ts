import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import { createMfSharedOptions, mfDedupe } from "../lib/mf-shared";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "..");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
      dev: { disableDynamicRemoteTypeHints: true, remoteHmr: true },
      name: "usersRemote",
      filename: "remoteEntry.js",
      exposes: {
        "./MePage": "./src/pages/MePage.tsx",
        "./UsersPage": "./src/pages/UsersPage.tsx",
        "./UserEditorPage": "./src/pages/UserEditorPage.tsx",
        "./RolesPermissionsPage": "./src/pages/RolesPermissionsPage.tsx",
      },
      shared: createMfSharedOptions(appDir, "remote"),
    }),
    react({ exclude: [/lib\/auth\/dist/] }),
    tailwindcss(),
  ],
  server: {
    port: 5174,
    strictPort: true,
    origin: "http://localhost:5174",
    // Dev remote modules execute in the portal host page; Fast Refresh breaks cross-origin.
    hmr: false,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    port: 5174,
    strictPort: true,
    cors: true,
  },
  build: {
    target: "chrome89",
  },
});
