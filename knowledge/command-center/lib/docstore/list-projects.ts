import { readdir } from "node:fs/promises";

export async function listProjects(docstoreRoot: string): Promise<string[]> {
  const entries = await readdir(docstoreRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
