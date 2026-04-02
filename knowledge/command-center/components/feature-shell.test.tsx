import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureShell } from "./feature-shell";

vi.mock("./project-selector", () => ({
  ProjectSelector: ({ onProjectChange }: { onProjectChange: (projectName: string) => void }) => (
    <button type="button" onClick={() => onProjectChange("beta")}>
      Select beta
    </button>
  )
}));

vi.mock("./chat-panel", () => ({
  ChatPanel: ({ project }: { project: string }) => <p>Chat project: {project}</p>
}));

describe("FeatureShell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("switches project scope and triggers new/continue actions", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/openclaw/health")) {
        return new Response(JSON.stringify({ state: "up" }), { status: 200 });
      }
      if (url.includes("/api/ollama/models")) {
        return new Response(JSON.stringify({ models: ["llama3.2:latest"] }), { status: 200 });
      }
      return new Response(null, { status: 404 });
    });

    const controller = {
      selectProject: vi.fn(),
      startNewChat: vi.fn(async () => undefined),
      continueChat: vi.fn(async () => undefined),
      getMessages: vi.fn(() => []),
      send: vi.fn(async () => undefined),
      subscribe: vi.fn(() => () => undefined)
    };

    render(<FeatureShell controller={controller} />);

    fireEvent.click(screen.getByRole("button", { name: "Select beta" }));
    expect(controller.selectProject).toHaveBeenCalledWith("beta");
    expect(screen.getByText("Chat project: beta")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(controller.startNewChat).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Continue chat" }));
    expect(controller.continueChat).toHaveBeenCalledTimes(1);
  });
});
