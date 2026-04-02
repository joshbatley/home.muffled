import { describe, expect, it, vi } from "vitest";
import { ChatSessionController } from "./chat-session-controller";
import type { ChatEventPayload } from "../openclaw/protocol";

function createClientMock() {
  let listener: ((event: ChatEventPayload) => void) | null = null;

  return {
    api: {
      ensureSession: vi.fn().mockResolvedValue("session-alpha"),
      newChat: vi.fn().mockResolvedValue(undefined),
      sendChat: vi.fn().mockResolvedValue(undefined),
      onChatEvent: vi.fn((cb: (event: ChatEventPayload) => void) => {
        listener = cb;
        return () => {
          listener = null;
        };
      })
    },
    emit(event: ChatEventPayload) {
      listener?.(event);
    }
  };
}

describe("ChatSessionController", () => {
  it("new chat clears messages for project", async () => {
    const client = createClientMock();
    const controller = new ChatSessionController(client.api);
    controller.selectProject("alpha");
    await controller.startNewChat();

    await controller.send("hello");
    expect(controller.getMessages("alpha")).toEqual([
      { role: "user", text: "hello" }
    ]);

    await controller.startNewChat();
    expect(controller.getMessages("alpha")).toEqual([]);
  });

  it("continue chat reuses prior messages", async () => {
    const client = createClientMock();
    const controller = new ChatSessionController(client.api);
    controller.selectProject("alpha");

    await controller.send("hello");
    await controller.continueChat();
    await controller.send("again");

    expect(controller.getMessages("alpha")).toEqual([
      { role: "user", text: "hello" },
      { role: "user", text: "again" }
    ]);
  });

  it("applies chat delta/final events to assistant message", async () => {
    const client = createClientMock();
    const controller = new ChatSessionController(client.api);
    controller.selectProject("alpha");
    await controller.continueChat();

    client.emit({
      runId: "run-1",
      sessionKey: "session-alpha",
      seq: 0,
      state: "delta",
      message: { content: [{ type: "text", text: "Hel" }] }
    });
    client.emit({
      runId: "run-1",
      sessionKey: "session-alpha",
      seq: 1,
      state: "final",
      message: { content: [{ type: "text", text: "Hello" }] }
    });

    expect(controller.getMessages("alpha")).toEqual([
      { role: "assistant", text: "Hello" }
    ]);
  });
});
