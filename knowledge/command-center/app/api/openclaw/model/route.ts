import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

const OPENCLAW_CONFIG_PATH = resolve(process.cwd(), "../.openclaw/openclaw.json");

type OpenClawConfig = {
  models?: {
    providers?: {
      ollama?: {
        models?: Array<{ id?: string; name?: string; reasoning?: boolean; input?: string[] }>;
      };
    };
  };
  agents?: {
    defaults?: {
      model?: { primary?: string };
      models?: Record<string, Record<string, never>>;
    };
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as { model?: string };
  const nextModel = (body.model ?? "").trim();

  if (!nextModel) {
    return NextResponse.json({ error: "model is required" }, { status: 400 });
  }

  const raw = await readFile(OPENCLAW_CONFIG_PATH, "utf8");
  const config = JSON.parse(raw) as OpenClawConfig;

  config.agents ??= {};
  config.agents.defaults ??= {};
  config.agents.defaults.model ??= {};
  config.agents.defaults.models ??= {};
  config.models ??= {};
  config.models.providers ??= {};
  config.models.providers.ollama ??= {};
  config.models.providers.ollama.models ??= [];

  const providerModels = config.models.providers.ollama.models;
  if (!providerModels.some((model) => model.id === nextModel)) {
    providerModels.push({
      id: nextModel,
      name: nextModel,
      reasoning: false,
      input: ["text"]
    });
  }

  config.agents.defaults.model.primary = `ollama/${nextModel}`;
  config.agents.defaults.models = {
    [`ollama/${nextModel}`]: {}
  };

  await writeFile(OPENCLAW_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  return NextResponse.json({ ok: true, model: nextModel });
}
