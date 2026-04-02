import type { ChatEventPayload } from "../openclaw/protocol";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type OpenClawClient = {
  ensureSession: (project: string) => Promise<string>;
  newChat: (project: string) => Promise<void>;
  sendChat: (input: { project: string; text: string }) => Promise<void>;
  onChatEvent: (listener: (event: ChatEventPayload) => void) => () => void;
};

type ProjectState = {
  sessionKey?: string;
  mode: "new" | "continue";
  messages: ChatMessage[];
};

function extractMessageText(message: unknown): string {
  if (!message || typeof message !== "object") {
    return "";
  }

  const content = (message as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return "";
  }

  const textParts = content
    .filter((part): part is { type?: unknown; text?: unknown } => !!part && typeof part === "object")
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string);

  return textParts.join("");
}

export class ChatSessionController {
  private readonly client: OpenClawClient;
  private readonly byProject = new Map<string, ProjectState>();
  private selectedProject: string | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(client: OpenClawClient) {
    this.client = client;

    this.client.onChatEvent((event) => {
      for (const state of this.byProject.values()) {
        if (state.sessionKey !== event.sessionKey) {
          continue;
        }

        const assistantText = extractMessageText(event.message);
        if (!assistantText) {
          continue;
        }

        const last = state.messages[state.messages.length - 1];
        if (!last || last.role !== "assistant") {
          state.messages.push({ role: "assistant", text: assistantText });
          this.emitChange();
          continue;
        }

        last.text = assistantText;
        this.emitChange();
      }
    });
  }

  selectProject(project: string): void {
    this.selectedProject = project;
    if (!this.byProject.has(project)) {
      this.byProject.set(project, { mode: "new", messages: [] });
      this.emitChange();
    }
  }

  async startNewChat(): Promise<void> {
    const project = this.requireProject();
    const state = this.getState(project);
    await this.client.newChat(project);
    state.mode = "new";
    state.messages = [];
    state.sessionKey = await this.client.ensureSession(project);
    this.emitChange();
  }

  async continueChat(): Promise<void> {
    const project = this.requireProject();
    const state = this.getState(project);
    state.mode = "continue";
    state.sessionKey = await this.client.ensureSession(project);
    this.emitChange();
  }

  async send(text: string): Promise<void> {
    const project = this.requireProject();
    const state = this.getState(project);
    if (!state.sessionKey) {
      state.sessionKey = await this.client.ensureSession(project);
    }
    state.messages.push({ role: "user", text });
    this.emitChange();
    await this.client.sendChat({ project, text });
  }

  getMessages(project: string): ChatMessage[] {
    return [...(this.byProject.get(project)?.messages ?? [])];
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private requireProject(): string {
    if (!this.selectedProject) {
      throw new Error("No project selected");
    }
    return this.selectedProject;
  }

  private getState(project: string): ProjectState {
    const state = this.byProject.get(project);
    if (!state) {
      throw new Error("Unknown project state");
    }
    return state;
  }

  private emitChange(): void {
    this.listeners.forEach((listener) => listener());
  }
}
