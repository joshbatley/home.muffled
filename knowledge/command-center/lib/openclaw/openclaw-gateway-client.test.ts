import { describe, expect, it } from "vitest";
import { OpenClawGatewayClient } from "./openclaw-gateway-client";
import type { EventFrame, ResponseFrame } from "./protocol";

type MessageHandler = (event: { data: string }) => void;
type OpenHandler = () => void;

class MockWebSocket {
  public sent: string[] = [];
  private openHandler: OpenHandler | null = null;
  private messageHandler: MessageHandler | null = null;

  addEventListener(event: "open" | "message", handler: OpenHandler | MessageHandler) {
    if (event === "open") {
      this.openHandler = handler as OpenHandler;
      return;
    }
    this.messageHandler = handler as MessageHandler;
  }

  send(data: string) {
    this.sent.push(data);
  }

  open() {
    this.openHandler?.();
  }

  receive(frame: ResponseFrame | EventFrame) {
    this.messageHandler?.({ data: JSON.stringify(frame) });
  }
}

function latestReqId(raw: string): string {
  const parsed = JSON.parse(raw) as { id: string };
  return parsed.id;
}

describe("OpenClawGatewayClient", () => {
  it("connects and sends sessions/chat methods", async () => {
    const ws = new MockWebSocket();
    const client = new OpenClawGatewayClient({
      url: "ws://localhost:18789",
      webSocketFactory: () => ws as unknown as WebSocket
    });

    const connected = client.connect();
    ws.open();
    const connectReq = ws.sent[0];
    ws.receive({
      type: "res",
      id: latestReqId(connectReq),
      ok: true,
      payload: { type: "hello-ok", protocol: 3 }
    });
    await connected;

    const ensurePromise = client.ensureSession("project-alpha");
    const ensureReq = ws.sent[1];
    ws.receive({
      type: "res",
      id: latestReqId(ensureReq),
      ok: true,
      payload: { key: "project-alpha-session" }
    });
    await ensurePromise;

    const resetPromise = client.newChat("project-alpha");
    await Promise.resolve();
    const resetReq = ws.sent[2];
    ws.receive({
      type: "res",
      id: latestReqId(resetReq),
      ok: true,
      payload: { reset: true }
    });
    await resetPromise;

    const sendPromise = client.sendChat({ project: "project-alpha", text: "hello", mode: "new" });
    await Promise.resolve();
    const sendReq = ws.sent[3];
    ws.receive({
      type: "res",
      id: latestReqId(sendReq),
      ok: true,
      payload: { accepted: true }
    });
    await sendPromise;

    const parsedEnsure = JSON.parse(ensureReq) as { method: string };
    const parsedReset = JSON.parse(resetReq) as { method: string };
    const parsedSend = JSON.parse(sendReq) as {
      method: string;
      params: { sessionKey: string; message: string; idempotencyKey: string };
    };

    expect(parsedEnsure.method).toBe("sessions.create");
    expect(parsedReset.method).toBe("sessions.reset");
    expect(parsedSend.method).toBe("chat.send");
    expect(parsedSend.params.sessionKey).toBe("project-alpha-session");
    expect(parsedSend.params.message).toBe("hello");
    expect(parsedSend.params.idempotencyKey.length).toBeGreaterThan(0);
    expect((JSON.parse(connectReq) as { method: string }).method).toBe("connect");
  });

  it("forwards chat stream events to listeners", async () => {
    const ws = new MockWebSocket();
    const client = new OpenClawGatewayClient({
      url: "ws://localhost:18789",
      webSocketFactory: () => ws as unknown as WebSocket
    });

    const updates: string[] = [];
    client.onChatEvent((event) => {
      updates.push(event.state);
    });

    const connected = client.connect();
    ws.open();
    const connectReq = ws.sent[0];
    ws.receive({
      type: "res",
      id: latestReqId(connectReq),
      ok: true,
      payload: { type: "hello-ok", protocol: 3 }
    });
    await connected;

    ws.receive({
      type: "event",
      event: "chat",
      payload: {
        runId: "run-1",
        sessionKey: "project-alpha-session",
        seq: 0,
        state: "delta",
        message: { content: [{ type: "text", text: "hel" }] }
      }
    });
    ws.receive({
      type: "event",
      event: "chat",
      payload: {
        runId: "run-1",
        sessionKey: "project-alpha-session",
        seq: 1,
        state: "final",
        message: { content: [{ type: "text", text: "hello" }] }
      }
    });

    expect(updates).toEqual(["delta", "final"]);
  });
});
