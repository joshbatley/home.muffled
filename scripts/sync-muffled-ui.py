#!/usr/bin/env python3
"""Sync @muffled registry theme + UI into portal and users (workaround for shadcn font CSS bug)."""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPS = ("portal", "users")
REGISTRY = "https://ui.muffled.studio/r/{name}.json"
COMPONENTS = (
    "theme",
    "surface",
    "button",
    "input",
    "label",
    "form",
    "card",
    "checkbox",
    "select",
)

FONT_BLOCK = """
@import "@fontsource-variable/space-grotesk";
@import "@fontsource/space-mono/400.css";
@import "@fontsource/space-mono/700.css";

@layer base {
  :root {
    --font-sans: "Space Grotesk Variable", "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
    --font-mono: "Space Mono", ui-monospace, monospace;
  }
}
"""


def fetch(name: str) -> dict:
    req = urllib.request.Request(
        REGISTRY.format(name=name),
        headers={"User-Agent": "home.muffled-sync/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def fix_imports(content: str) -> str:
    return (
        content.replace("@/registry/lib/surface", "@/lib/surface")
        .replace("@/registry/ui/label", "@/components/ui/label")
        .replace("@/registry/lib/portal-container", "@/lib/portal-container")
    )


def rules_to_css(rules: dict, indent: str = "  ") -> list[str]:
    lines: list[str] = []
    for prop, val in rules.items():
        if isinstance(val, dict):
            if prop.startswith("@"):
                lines.append(f"{indent}{prop} {{")
                lines.extend(rules_to_css(val, indent + "  "))
                lines.append(f"{indent}}}")
            else:
                lines.append(f"{indent}{prop} {{")
                lines.extend(rules_to_css(val, indent + "  "))
                lines.append(f"{indent}}}")
        else:
            lines.append(f"{indent}{prop}: {val};")
    return lines


def theme_to_css(theme: dict) -> str:
    parts = [
        '@import "tailwindcss";',
        '@import "tw-animate-css";',
        '@import "shadcn/tailwind.css";',
        "",
        FONT_BLOCK.strip(),
        "",
    ]
    for selector, rules in theme["css"].items():
        if selector == "@layer base":
            parts.append("@layer base {")
            for inner_sel, inner_rules in rules.items():
                parts.append(f"  {inner_sel} {{")
                parts.extend(rules_to_css(inner_rules, "    "))
                parts.append("  }")
            parts.append("}")
            parts.append("")
            continue
        parts.append(f"{selector} {{")
        if isinstance(rules, dict):
            parts.extend(rules_to_css(rules))
        parts.append("}")
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def write_component_files(app_dir: Path, items: dict[str, dict]) -> None:
    for name, data in items.items():
        if name == "theme":
            (app_dir / "src/index.css").write_text(theme_to_css(data))
            continue
        for fi in data.get("files", []):
            target = fi.get("target") or fi["path"].replace("registry/", "")
            path = app_dir / "src" / target
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(fix_imports(fi["content"]))


def main() -> None:
    items = {name: fetch(name) for name in COMPONENTS}
    for app in APPS:
        write_component_files(ROOT / app, items)
        print(f"synced muffled.ui -> {app}/")


if __name__ == "__main__":
    main()
