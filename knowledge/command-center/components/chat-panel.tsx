"use client";

import { useEffect, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
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
