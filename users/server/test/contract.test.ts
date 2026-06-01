import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { healthRoutes } from "../src/handlers/health.ts";

describe("contract: health", () => {
  test("heartbeat returns ok", async () => {
    const sql = { async (): Promise<unknown[]> { return []; } } as never;
    const app = new Hono();
    app.route("/", healthRoutes({ sql } as never));
    const res = await app.request("/v1/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
