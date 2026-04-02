import { describe, expect, it } from "vitest";
import {
  createRequestFrame,
  isChatEventFrame,
  parseGatewayFrame,
  type GatewayFrame,
  type RequestFrame,
  type ResponseFrame
} from "./protocol";

describe("OpenClaw protocol utils", () => {
  it("parses request/response/event frames", () => {
    const req = parseGatewayFrame(
      JSON.stringify({
        type: "req",
        id: "1",
        method: "sessions.create",
        params: { key: "project-a" }
      })
    );
    const res = parseGatewayFrame(
      JSON.stringify({
        type: "res",
        id: "1",
        ok: true,
        payload: { key: "project-a" }
      })
    );
    const event = parseGatewayFrame(
      JSON.stringify({
        type: "event",
        event: "chat",
        payload: {
          runId: "run-1",
          sessionKey: "project-a",
          seq: 0,
          state: "delta",
          message: { role: "assistant", content: [{ type: "text", text: "Hello" }] }
        }
      })
    );

    expect(req.type).toBe("req");
    expect(res.type).toBe("res");
    expect(event.type).toBe("event");
    expect(isChatEventFrame(event)).toBe(true);
  });

  it("throws on invalid frame shape", () => {
    expect(() => parseGatewayFrame(JSON.stringify({ bad: true }))).toThrowError();
  });

  it("creates correlatable request frames", () => {
    const request = createRequestFrame("chat.send", {
      sessionKey: "project-a",
      message: "hi",
      idempotencyKey: "id-1"
    });

    expect(request.type).toBe("req");
    expect(request.id.length).toBeGreaterThan(0);
    expect(request.method).toBe("chat.send");
  });

  it("matches responses by id", () => {
    const request: RequestFrame = {
      type: "req",
      id: "req-123",
      method: "sessions.reset",
      params: { key: "project-a", reason: "new" }
    };

    const incoming: GatewayFrame[] = [
      { type: "event", event: "chat", payload: { state: "delta" } },
      { type: "res", id: "other", ok: true, payload: {} } as ResponseFrame,
      { type: "res", id: "req-123", ok: true, payload: { reset: true } } as ResponseFrame
    ];

    const matched = incoming.find(
      (frame): frame is ResponseFrame =>
        frame.type === "res" && frame.id === request.id
    );

    expect(matched?.payload).toEqual({ reset: true });
  });
});
