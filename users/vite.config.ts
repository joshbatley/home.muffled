import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import { createMfSharedOptions, mfDedupe } from "../lib/mf-shared";

const appDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [...mfDedupe],
  },
  plugins: [
    react(),
    tailwindcss(),
    federation({
      dts: false,
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
  ],
  server: {
    port: 5174,
  },
  build: {
    target: "esnext",
  },
});
