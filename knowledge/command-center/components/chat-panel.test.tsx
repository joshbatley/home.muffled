import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./chat-panel";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  sources?: {
    title?: string;
    url?: string;
    path?: string;
    snippet?: string;
  }[];
};

function createControllerMock() {
  let listener: (() => void) | null = null;
  let messages: ChatMessage[] = [];

  return {
    controller: {
      getMessages: vi.fn(() => messages),
      send: vi.fn(async (_text: string) => undefined),
      subscribe: vi.fn((cb: () => void) => {
        listener = cb;
        return () => {
          listener = null;
        };
      })
    },
    setMessages(next: ChatMessage[]) {
      messages = next;
      listener?.();
    }
  };
}

afterEach(() => {
  cleanup();
});

describe("ChatPanel", () => {
  it("renders streaming assistant updates", async () => {
    const mock = createControllerMock();
    render(<ChatPanel project="alpha" controller={mock.controller} />);

    mock.setMessages([
      { role: "assistant", text: "Hel" }
    ]);
    await waitFor(() => {
      expect(screen.getByText("Hel")).toBeInTheDocument();
    });

    mock.setMessages([
      { role: "assistant", text: "Hello" }
    ]);
    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });
  });

  it("submits user input through controller", async () => {
    const mock = createControllerMock();
    render(<ChatPanel project="alpha" controller={mock.controller} />);

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi there" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(mock.controller.send).toHaveBeenCalledWith("Hi there");
  });

  it("renders assistant sources", async () => {
    const mock = createControllerMock();
    render(<ChatPanel project="alpha" controller={mock.controller} />);

    mock.setMessages([
      {
        role: "assistant",
        text: "See docs",
        sources: [{ title: "DECISIONS", path: "alpha/docs/DECISIONS.md" }]
      }
    ]);

    await waitFor(() => {
      expect(screen.getByText("Sources")).toBeInTheDocument();
      expect(screen.getByText("DECISIONS")).toBeInTheDocument();
    });
  });
});
