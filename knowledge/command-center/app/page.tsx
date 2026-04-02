"use client";

import { useEffect, useMemo } from "react";
import { FeatureShell } from "../components/feature-shell";
import { ChatSessionController } from "../lib/chat/chat-session-controller";
import { OpenClawGatewayClient } from "../lib/openclaw/openclaw-gateway-client";

export default function HomePage() {
  const controller = useMemo(() => {
    const gatewayClient = new OpenClawGatewayClient({
      url: "ws://localhost:18789"
    });
    const sessionController = new ChatSessionController(gatewayClient);
    return { gatewayClient, sessionController };
  }, []);

  useEffect(() => {
    void controller.gatewayClient.connect();
  }, [controller]);

  return <FeatureShell controller={controller.sessionController} />;
}
