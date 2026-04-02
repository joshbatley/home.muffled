"use client";

import { useEffect, useState } from "react";

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

type ChatController = {
  getMessages: (project: string) => ChatMessage[];
  send: (text: string) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

type ChatPanelProps = {
  project: string;
  controller: ChatController;
};

export function ChatPanel({ project, controller }: ChatPanelProps) {
  const [messageInput, setMessageInput] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const messages = controller.getMessages(project);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setRefreshKey((value) => value + 1);
    });
    return unsubscribe;
  }, [controller]);

  return (
    <section data-refresh={refreshKey}>
      <div>
        {messages.map((message, index) => (
          <p key={`${message.role}-${index}`}>
            <strong>{message.role === "user" ? "You" : "Assistant"}:</strong> {message.text}
          </p>
        ))}
        {messages.map((message, index) => {
          if (message.role !== "assistant" || !message.sources?.length) {
            return null;
          }

          return (
            <details key={`sources-${index}`}>
              <summary>Sources</summary>
              <ul>
                {message.sources.map((source, sourceIndex) => (
                  <li key={`${index}-${source.path ?? source.url ?? source.title ?? sourceIndex}`}>
                    {source.title ?? source.path ?? source.url ?? "Source"}
                    {source.url ? ` (${source.url})` : ""}
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
      <label>
        Message
        <input
          aria-label="Message"
          value={messageInput}
          onChange={(event) => setMessageInput(event.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={() => {
          const next = messageInput.trim();
          if (!next) {
            return;
          }
          void controller.send(next);
          setMessageInput("");
        }}
      >
        Send
      </button>
    </section>
  );
}
