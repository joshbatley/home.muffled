import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/surface";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-md border border-border bg-background outline-none transition-opacity duration-[var(--d-drift)] ease-[var(--ease-drift)] after:absolute after:-inset-x-3 after:-inset-y-2 hover:opacity-60 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-40 active:duration-[var(--d-snap)] active:ease-[var(--ease-snap)] disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-disabled/field:opacity-40",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current [&>svg]:size-3.5"
      >
        <CheckIcon strokeWidth={1.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
