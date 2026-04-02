import { describe, expect, it } from "vitest";
import { buildProjectRetrievalScope } from "./retrieval-scope";

describe("buildProjectRetrievalScope", () => {
  it("includes markdown files and excludes chats", () => {
    const scope = buildProjectRetrievalScope("alpha");

    expect(scope).toEqual({
      project: "alpha",
      include: ["alpha/**/*.md"],
      exclude: ["alpha/chats/**"]
    });
  });
});
