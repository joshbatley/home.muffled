import { Link } from "react-router-dom";
import { cn } from "@/lib/surface";

type MuffledLogoProps = {
  to?: string;
  layout?: "row" | "stacked";
  linked?: boolean;
  className?: string;
};

export default function MuffledLogo({
  to = "/me",
  layout = "row",
  linked = true,
  className,
}: MuffledLogoProps) {
  const markClass = layout === "stacked" ? "h-8 w-auto" : "h-6 w-auto";
  const content = (
    <>
      <img src="/logo-light.svg" alt="" className={cn(markClass, "dark:hidden")} />
      <img src="/logo-dark.svg" alt="" className={cn(markClass, "hidden dark:block")} />
      <span className="font-mono text-sm font-medium tracking-tight">muffled.home</span>
    </>
  );

  const wrapperClass = cn(
    "text-foreground",
    layout === "stacked" ? "flex flex-col items-center gap-2" : "flex items-center gap-2.5",
    linked && "hover:opacity-60",
    className,
  );

  if (!linked) {
    return <div className={wrapperClass}>{content}</div>;
  }

  return (
    <Link to={to} className={wrapperClass}>
      {content}
    </Link>
  );
}
