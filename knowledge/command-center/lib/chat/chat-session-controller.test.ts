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
    expect(client.api.newChat).toHaveBeenCalledWith("alpha");
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
    expect(client.api.sendChat).toHaveBeenLastCalledWith({
      project: "alpha",
      text: "again",
      mode: "continue"
    });
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
      { role: "assistant", text: "Hello", sources: [] }
    ]);
  });

  it("stores assistant sources from chat events", async () => {
    const client = createClientMock();
    const controller = new ChatSessionController(client.api);
    controller.selectProject("alpha");
    await controller.continueChat();

    client.emit({
      runId: "run-1",
      sessionKey: "session-alpha",
      seq: 1,
      state: "final",
      message: { content: [{ type: "text", text: "Use postgres" }] },
      sources: [{ title: "Decision", path: "alpha/docs/DECISIONS.md" }]
    });

    expect(controller.getMessages("alpha")).toEqual([
      {
        role: "assistant",
        text: "Use postgres",
        sources: [{ title: "Decision", path: "alpha/docs/DECISIONS.md", url: undefined, snippet: undefined }]
      }
    ]);
  });

  it("handles missing or partial sources without crashing", async () => {
    const client = createClientMock();
    const controller = new ChatSessionController(client.api);
    controller.selectProject("alpha");
    await controller.continueChat();

    client.emit({
      runId: "run-2",
      sessionKey: "session-alpha",
      seq: 1,
      state: "final",
      message: { content: [{ type: "text", text: "Done" }] },
      sources: [{ bad: true } as unknown as { title?: string }]
    });

    expect(controller.getMessages("alpha")).toEqual([
      {
        role: "assistant",
        text: "Done",
        sources: [{ title: undefined, url: undefined, path: undefined, snippet: undefined }]
      }
    ]);
  });

  it("sends with new mode by default", async () => {
    const client = createClientMock();
    const controller = new ChatSessionController(client.api);
    controller.selectProject("alpha");

    await controller.send("hello");

    expect(client.api.sendChat).toHaveBeenCalledWith({
      project: "alpha",
      text: "hello",
      mode: "new"
    });
  });
});
