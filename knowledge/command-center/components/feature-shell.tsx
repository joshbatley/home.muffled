"use client";

import { useCallback, useState } from "react";
import { useEffect } from "react";
import { ChatPanel } from "./chat-panel";
import { ProjectSelector } from "./project-selector";

type Controller = {
  selectProject: (project: string) => void;
  startNewChat: () => Promise<void>;
  continueChat: () => Promise<void>;
  getMessages: (project: string) => { role: "user" | "assistant"; text: string }[];
  send: (text: string) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

type FeatureShellProps = {
  controller: Controller;
};

export function FeatureShell({ controller }: FeatureShellProps) {
  const projectStorageKey = "command-center:selected-project";
  const modelStorageKey = "command-center:selected-model";
  const [project, setProject] = useState("");
  const [health, setHealth] = useState<"up" | "starting" | "down">("down");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelMessage, setModelMessage] = useState("");
  const storage =
    typeof window !== "undefined" &&
    typeof window.localStorage?.getItem === "function" &&
    typeof window.localStorage?.setItem === "function"
      ? window.localStorage
      : null;

  const applyModel = useCallback(
    async (model: string, silent = false) => {
      if (!model) {
        return;
      }

      try {
        const response = await fetch("/api/openclaw/model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model })
        });
        if (!response.ok) {
          if (!silent) {
            setModelMessage("Could not update model");
          }
          return;
        }

        storage?.setItem(modelStorageKey, model);
        if (!silent) {
          setModelMessage(`Model set to ${model}. Restart OpenClaw to apply.`);
        }
      } catch {
        if (!silent) {
          setModelMessage("Could not update model");
        }
      }
    },
    [modelStorageKey, storage]
  );

  useEffect(() => {
    const rememberedModel = storage?.getItem(modelStorageKey);
    if (rememberedModel) {
      setSelectedModel(rememberedModel);
    }
  }, [modelStorageKey, storage]);

  useEffect(() => {
    if (typeof fetch !== "function") {
      return;
    }

    const checkHealth = async () => {
      try {
        const response = await fetch("/api/openclaw/health");
        const payload = (await response.json()) as { state?: "up" | "starting" | "down" };
        setHealth(payload.state ?? "down");
      } catch {
        setHealth("down");
      }
    };

    void checkHealth();
    const interval = window.setInterval(() => {
      void checkHealth();
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof fetch !== "function") {
      return;
    }

    const loadModels = async () => {
      try {
        const response = await fetch("/api/ollama/models");
        const payload = (await response.json()) as { models?: string[] };
        const models = payload.models ?? [];
        setAvailableModels(models);
        const remembered = storage?.getItem(modelStorageKey);
        if (remembered && models.includes(remembered)) {
          setSelectedModel(remembered);
          void applyModel(remembered, true);
          return;
        }

        setSelectedModel((current) => current || models[0] || "");
      } catch {
        setAvailableModels([]);
      }
    };

    void loadModels();
  }, [applyModel, modelStorageKey, storage]);
  const handleProjectChange = useCallback(
    (nextProject: string) => {
      setProject(nextProject);
      storage?.setItem(projectStorageKey, nextProject);
      controller.selectProject(nextProject);
    },
    [controller, projectStorageKey, storage]
  );

  return (
    <main>
      <h1>Command Center</h1>
      <p>
        OpenClaw health:{" "}
        <span
          style={{
            color: health === "up" ? "green" : health === "starting" ? "#b58900" : "red",
            fontWeight: 700
          }}
        >
          {health}
        </span>
      </p>
      <div>
        <label htmlFor="model-select">Model</label>{" "}
        <select
          id="model-select"
          value={selectedModel}
          onChange={(event) => {
            const model = event.target.value;
            setSelectedModel(model);
            storage?.setItem(modelStorageKey, model);
          }}
        >
          <option value="">Select model</option>
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>{" "}
        <button
          type="button"
          disabled={!selectedModel}
          onClick={() => {
            void applyModel(selectedModel);
          }}
        >
          Apply model
        </button>
        {modelMessage ? <p>{modelMessage}</p> : null}
      </div>
      <ProjectSelector
        onProjectChange={handleProjectChange}
        initialProject={project}
        projectStorageKey={projectStorageKey}
      />
      <div>
        <button
          type="button"
          disabled={!project}
          onClick={() => void controller.startNewChat()}
        >
          New chat
        </button>
        <button
          type="button"
          disabled={!project}
          onClick={() => void controller.continueChat()}
        >
          Continue chat
        </button>
      </div>
      {project ? <ChatPanel project={project} controller={controller} /> : null}
    </main>
  );
}
