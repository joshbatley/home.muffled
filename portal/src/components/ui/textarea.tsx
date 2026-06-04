import * as React from "react"

import { cn } from "@/lib/surface"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-y rounded-md border border-border bg-transparent px-3 py-2 font-mono text-xs text-foreground outline-none transition-[border-color] duration-[var(--d-drift)] ease-[var(--ease-drift)] placeholder:text-muted-foreground focus-visible:border-foreground disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
