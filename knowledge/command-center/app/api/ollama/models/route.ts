import { NextResponse } from "next/server";

type OllamaTagsResponse = {
  models?: Array<{ name?: string }>;
};

export async function GET() {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";

  try {
    const response = await fetch(`${baseUrl}/api/tags`, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ models: [] }, { status: 200 });
    }

    const payload = (await response.json()) as OllamaTagsResponse;
    const models = (payload.models ?? [])
      .map((model) => model.name)
      .filter((name): name is string => typeof name === "string")
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] }, { status: 200 });
  }
}
