import path from "node:path";
import type { Plugin } from "vite";

/** Resolve `@/` to users/src when the importer lives under the users package. */
export function usersWorkspaceAlias(usersRoot: string): Plugin {
  const usersSrc = path.join(usersRoot, "src");
  return {
    name: "users-workspace-alias",
    resolveId(source, importer) {
      if (!importer?.includes(`${path.sep}users${path.sep}`)) return;
      if (!source.startsWith("@/")) return;
      return path.join(usersSrc, source.slice(2));
    },
  };
}
