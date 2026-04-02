import { NextResponse } from "next/server";

type HealthState = "up" | "starting" | "down";

function classifyHealth(bodyText: string, status: number): HealthState {
  if (status >= 500) {
    return "down";
  }

  const lower = bodyText.toLowerCase();
  if (lower.includes("starting") || lower.includes("boot")) {
    return "starting";
  }

  return status >= 200 && status < 300 ? "up" : "down";
}

export async function GET() {
  try {
    const response = await fetch("http://127.0.0.1:18789/health", { cache: "no-store" });
    const text = await response.text();
    const state = classifyHealth(text, response.status);
    return NextResponse.json({ state, details: text });
  } catch {
    return NextResponse.json({ state: "down", details: "unreachable" });
  }
}
