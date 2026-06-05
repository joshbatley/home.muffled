import { readFileSync } from "node:fs";
import { join } from "node:path";

type Pkg = { dependencies?: Record<string, string> };

function pkgFrom(cwd: string): Pkg {
  return JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as Pkg;
}

function req(pkg: Pkg, name: string) {
  return pkg.dependencies?.[name] ?? "*";
}

export function createMfSharedOptions(appDir: string, role: "host" | "remote") {
  const pkg = pkgFrom(appDir);
  const isHost = role === "host";
  const singleton = { singleton: true as const };
  const eager = isHost ? { eager: true as const } : {};

  return {
    react: { ...singleton, ...eager, requiredVersion: req(pkg, "react") },
    "react/": { singleton: true },
    "react-dom": { ...singleton, ...eager, requiredVersion: req(pkg, "react-dom") },
    "react-dom/": { singleton: true },
    "react-router-dom": { ...singleton, ...eager, requiredVersion: req(pkg, "react-router-dom") },
    "@home/auth": { ...singleton, ...eager, requiredVersion: req(pkg, "@home/auth") },
  };
}

export const mfDedupe = ["react", "react-dom", "react-router-dom", "@home/auth"] as const;
