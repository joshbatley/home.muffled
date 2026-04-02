import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listProjects } from "./list-projects";

const tempDirs: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    tempDirs.map(async (dirPath) => {
      await rm(dirPath, { recursive: true, force: true });
    })
  );
});

describe("listProjects", () => {
  it("returns only immediate child directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "docstore-"));
    tempDirs.push(root);

    await mkdir(join(root, "alpha"));
    await mkdir(join(root, "beta"));
    await mkdir(join(root, ".git"));
    await mkdir(join(root, "alpha", "nested"));
    await writeFile(join(root, "README.md"), "not-a-project", "utf8");

    const result = await listProjects(root);

    expect(result).toEqual(["alpha", "beta"]);
  });
});
