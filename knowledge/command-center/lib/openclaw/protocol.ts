export type RequestFrame = {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
};

export type ResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type EventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: unknown;
};

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame;

export type ChatEventPayload = {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "delta" | "final" | "aborted" | "error";
  message?: unknown;
  errorMessage?: string;
  usage?: unknown;
  stopReason?: string;
};

function generateId(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createRequestFrame(method: string, params?: unknown): RequestFrame {
  return {
    type: "req",
    id: generateId(),
    method,
    params
  };
}

export function parseGatewayFrame(raw: string): GatewayFrame {
  const parsed: unknown = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid gateway frame: not an object");
  }

  const frame = parsed as { type?: unknown };
  if (frame.type === "req") {
    const req = parsed as RequestFrame;
    if (!req.id || !req.method) {
      throw new Error("Invalid request frame");
    }
    return req;
  }

  if (frame.type === "res") {
    const res = parsed as ResponseFrame;
    if (!res.id || typeof res.ok !== "boolean") {
      throw new Error("Invalid response frame");
    }
    return res;
  }

  if (frame.type === "event") {
    const event = parsed as EventFrame;
    if (!event.event) {
      throw new Error("Invalid event frame");
    }
    return event;
  }

  throw new Error("Invalid gateway frame: unsupported type");
}

export function isChatEventFrame(frame: GatewayFrame): frame is EventFrame & { payload: ChatEventPayload } {
  return frame.type === "event" && frame.event === "chat";
}
