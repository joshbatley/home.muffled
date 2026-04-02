import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";

vi.mock("../components/feature-shell", () => ({
  FeatureShell: () => <h1>Command Center</h1>
}));

vi.mock("../lib/openclaw/openclaw-gateway-client", () => ({
  OpenClawGatewayClient: class {
    connect = vi.fn(async () => undefined);
    onChatEvent = vi.fn(() => () => undefined);
    ensureSession = vi.fn(async () => "session-test");
    newChat = vi.fn(async () => undefined);
    sendChat = vi.fn(async () => undefined);
  }
}));

describe("HomePage", () => {
  it("renders command center heading", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Command Center" })
    ).toBeInTheDocument();
  });
});
