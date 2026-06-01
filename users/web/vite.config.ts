import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "usersRemote",
      filename: "remoteEntry.js",
      exposes: {
        "./UsersRoutes": "./src/remote/UsersRoutes.tsx",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
        "react-router-dom": { singleton: true },
        "@home/auth-ts": { singleton: true },
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      "/v1": "http://localhost:8080",
    },
  },
  build: {
    target: "esnext",
  },
});
