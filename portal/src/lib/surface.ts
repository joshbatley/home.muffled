import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Paper/ink floating panel — menus, popovers, select dropdowns. */
export function floatingSurfaceClasses(...extra: string[]) {
  return cn(
    "rounded-md border border-border-strong bg-popover text-popover-foreground shadow-none outline-hidden duration-[var(--d-drift)] ease-[var(--ease-drift)] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    extra,
  );
}

/** Modal / dialog panel on paper. */
export function modalSurfaceClasses(...extra: string[]) {
  return cn(
    "rounded-md border border-border bg-popover text-popover-foreground shadow-none outline-none duration-[var(--d-drift)] ease-[var(--ease-drift)] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
    extra,
  );
}

/** Ink/56 focus ring. Pair with `outline-none` on the control. */
export const focusRingClasses =
  "focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-ring";
