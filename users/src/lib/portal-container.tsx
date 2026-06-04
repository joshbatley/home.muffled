import type { ReactNode } from "react";

export function ThemedPortalShell({ children }: { children: ReactNode }) {
  return <div className="font-sans text-foreground">{children}</div>;
}
