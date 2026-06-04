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
  const eager = role === "host";
  const base = {
    singleton: true as const,
    ...(eager ? { eager: true as const } : {}),
  };

  return {
    react: { ...base, requiredVersion: req(pkg, "react") },
    "react-dom": { ...base, requiredVersion: req(pkg, "react-dom") },
    "react/jsx-runtime": { ...base },
    "react/jsx-dev-runtime": { ...base },
    "react-router-dom": { ...base, requiredVersion: req(pkg, "react-router-dom") },
    "@home/auth": { ...base },
  };
}

export const mfDedupe = ["react", "react-dom", "react-router-dom"] as const;
