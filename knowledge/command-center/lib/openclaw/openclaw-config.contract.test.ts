import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(currentDir, "../../../.openclaw/openclaw.json");

describe("OpenClaw QMD config contract", () => {
  it("uses qmd memory backend with markdown scope excluding chats", async () => {
    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw) as {
      memory?: {
        backend?: string;
        citations?: string;
        qmd?: {
          searchMode?: string;
          paths?: Array<{ path?: string; pattern?: string; name?: string }>;
          scope?: { default?: string; rules?: Array<{ action?: string; match?: { path?: string } }> };
          update?: { onBoot?: boolean };
        };
      };
    };

    expect(config.memory?.backend).toBe("qmd");
    expect(config.memory?.citations).toBe("on");
    expect(config.memory?.qmd?.searchMode).toBe("search");
    expect(config.memory?.qmd?.update?.onBoot).toBe(true);
    expect(config.memory?.qmd?.paths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/home/node/.openclaw/workspace",
          pattern: "**/*.md"
        })
      ])
    );
    expect(config.memory?.qmd?.scope?.default).toBe("allow");
  });
});
