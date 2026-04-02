"use client";

import { useCallback, useState } from "react";
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
  const [project, setProject] = useState("");
  const handleProjectChange = useCallback(
    (nextProject: string) => {
      setProject(nextProject);
      controller.selectProject(nextProject);
    },
    [controller]
  );

  return (
    <main>
      <h1>Command Center</h1>
      <ProjectSelector onProjectChange={handleProjectChange} />
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
