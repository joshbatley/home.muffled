import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectSelector } from "./project-selector";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ProjectSelector", () => {
  it("loads projects and emits selected project", async () => {
    const onProjectChange = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ projects: ["alpha", "beta"] })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProjectSelector onProjectChange={onProjectChange} />);

    expect(screen.getByText("Loading projects...")).toBeInTheDocument();

    const select = await screen.findByLabelText("Project");
    expect(fetchMock).toHaveBeenCalledWith("/api/projects");
    expect(screen.getByRole("option", { name: "alpha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "beta" })).toBeInTheDocument();
    expect(onProjectChange).toHaveBeenCalledWith("alpha");

    fireEvent.change(select, { target: { value: "beta" } });
    expect(onProjectChange).toHaveBeenCalledWith("beta");
  });

  it("renders an error state when loading fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProjectSelector onProjectChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load projects.")).toBeInTheDocument();
    });
  });
});
