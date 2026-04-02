import {
  createRequestFrame,
  isChatEventFrame,
  parseGatewayFrame,
  type ChatEventPayload,
  type ResponseFrame
} from "./protocol";

type WsLike = {
  addEventListener: (
    event: "open" | "message",
    handler: ((event: { data: string }) => void) | (() => void)
  ) => void;
  send: (data: string) => void;
};

type PendingResponse = {
  resolve: (frame: ResponseFrame) => void;
  reject: (error: Error) => void;
};

type OpenClawGatewayClientOptions = {
  url: string;
  webSocketFactory?: (url: string) => WebSocket;
};

function generateId(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class OpenClawGatewayClient {
  private readonly url: string;
  private readonly webSocketFactory: (url: string) => WebSocket;
  private socket: WsLike | null = null;
  private readonly pendingResponses = new Map<string, PendingResponse>();
  private readonly sessionKeys = new Map<string, string>();
  private readonly listeners = new Set<(event: ChatEventPayload) => void>();
  private isConnected = false;

  constructor(options: OpenClawGatewayClientOptions) {
    this.url = options.url;
    this.webSocketFactory = options.webSocketFactory ?? ((url) => new WebSocket(url));
  }

  async connect(): Promise<void> {
    if (this.socket && this.isConnected) {
      return;
    }

    const socket = this.webSocketFactory(this.url) as unknown as WsLike;
    this.socket = socket;

    socket.addEventListener("message", (event) => {
      const frame = parseGatewayFrame(event.data);

      if (frame.type === "res") {
        const pending = this.pendingResponses.get(frame.id);
        if (!pending) {
          return;
        }
        this.pendingResponses.delete(frame.id);
        if (!frame.ok) {
          pending.reject(new Error(frame.error?.message ?? "Gateway request failed"));
          return;
        }
        pending.resolve(frame);
        return;
      }

      if (isChatEventFrame(frame) && frame.payload) {
        const payload = frame.payload as ChatEventPayload;
        this.listeners.forEach((listener) => listener(payload));
      }
    });

    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", async () => {
        try {
          await this.requestInternal("connect", {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "openclaw-control-ui",
              version: "0.1.0",
              platform: "web",
              mode: "ui"
            },
            role: "operator",
            scopes: ["operator.read", "operator.write", "operator.admin"],
            caps: [],
            commands: [],
            permissions: {},
            auth: process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN
              ? { token: process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN }
              : undefined,
            locale: "en-US",
            userAgent: "command-center/0.1.0"
          });
          this.isConnected = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  onChatEvent(listener: (event: ChatEventPayload) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async ensureSession(project: string): Promise<string> {
    const existing = this.sessionKeys.get(project);
    if (existing) {
      return existing;
    }

    const desiredKey = `${project}-${generateId()}`;
    const response = await this.request("sessions.create", { key: desiredKey });
    const payload = (response.payload ?? {}) as { key?: string };
    const sessionKey = payload.key ?? desiredKey;
    this.sessionKeys.set(project, sessionKey);
    return sessionKey;
  }

  async newChat(project: string): Promise<void> {
    const sessionKey = await this.ensureSession(project);
    await this.request("sessions.reset", { key: sessionKey, reason: "new" });
  }

  async sendChat(input: { project: string; text: string; mode: "new" | "continue" }): Promise<void> {
    const sessionKey = await this.ensureSession(input.project);
    await this.request("chat.send", {
      sessionKey,
      message: input.text,
      idempotencyKey: generateId()
    });
  }

  private request(method: string, params?: unknown): Promise<ResponseFrame> {
    if (!this.isConnected) {
      throw new Error("OpenClawGatewayClient is not connected");
    }
    return this.requestInternal(method, params);
  }

  private requestInternal(method: string, params?: unknown): Promise<ResponseFrame> {
    if (!this.socket) {
      throw new Error("OpenClawGatewayClient is not connected");
    }

    const request = createRequestFrame(method, params);
    this.socket.send(JSON.stringify(request));

    return new Promise<ResponseFrame>((resolve, reject) => {
      this.pendingResponses.set(request.id, { resolve, reject });
    });
  }
}
