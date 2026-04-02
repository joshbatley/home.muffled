import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "../../components/chat-panel";
import { buildProjectRetrievalScope } from "./retrieval-scope";

describe("Feature 2 acceptance mapping", () => {
  it("builds project-scoped retrieval with chats excluded", () => {
    const scope = buildProjectRetrievalScope("project-x");

    expect(scope.include).toEqual(["project-x/**/*.md"]);
    expect(scope.exclude).toEqual(["project-x/chats/**"]);
  });

  it("renders answer citations in UI", () => {
    const controller = {
      getMessages: vi.fn(() => [
        {
          role: "assistant" as const,
          text: "Answer",
          sources: [{ title: "Source A", path: "project-x/docs/ARCH.md" }]
        }
      ]),
      send: vi.fn(async () => undefined),
      subscribe: vi.fn(() => () => undefined)
    };

    render(<ChatPanel project="project-x" controller={controller} />);

    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Source A")).toBeInTheDocument();
  });
});
