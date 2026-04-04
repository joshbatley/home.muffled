"""
title: Save to Knowledge
author: home.muffled
version: 1.0.0
required_open_webui_version: 0.5.0
"""

import os
import re
from datetime import datetime

import httpx
from pydantic import BaseModel


class Action:
    class Valves(BaseModel):
        docs_path: str = "/app/backend/data/docs"
        priority: int = 0

    def __init__(self):
        self.valves = self.Valves()

    async def action(
        self,
        body: dict,
        __user__=None,
        __event_emitter__=None,
        __event_call__=None,
        __request__=None,
    ):
        messages = body.get("messages", [])
        assistant_messages = [m for m in messages if m.get("role") == "assistant"]
        if not assistant_messages:
            await __event_emitter__(
                {"type": "notification", "data": {"type": "error", "content": "No assistant message found."}}
            )
            return

        content = assistant_messages[-1].get("content", "")

        auth_header = __request__.headers.get("authorization", "")
        token = auth_header.replace("Bearer ", "") if auth_header else ""
        base_url = str(__request__.base_url).rstrip("/")
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Fetch knowledge bases
        async with httpx.AsyncClient() as client:
            kb_resp = await client.get(f"{base_url}/api/v1/knowledge/", headers=auth_headers)

        knowledge_bases = kb_resp.json() if kb_resp.status_code == 200 else []
        if not knowledge_bases:
            await __event_emitter__(
                {
                    "type": "notification",
                    "data": {
                        "type": "error",
                        "content": "No knowledge bases found. Create one in Workspace → Knowledge first.",
                    },
                }
            )
            return

        # Prompt: filename
        slug = re.sub(r"[^\w\s-]", "", content[:50]).strip().replace(" ", "-").lower()
        default_name = f"{datetime.now().strftime('%Y-%m-%d')}-{slug}"

        filename_input = await __event_call__(
            {
                "type": "input",
                "data": {
                    "title": "Save to Knowledge",
                    "message": "Filename (without .md):",
                    "placeholder": default_name,
                },
            }
        )
        filename = (filename_input or default_name).strip().removesuffix(".md") or default_name

        # Prompt: knowledge base
        kb_list = "\n".join(f"{i + 1}. {kb['name']}" for i, kb in enumerate(knowledge_bases))
        kb_input = await __event_call__(
            {
                "type": "input",
                "data": {
                    "title": "Select Knowledge Base",
                    "message": f"Enter number:\n{kb_list}",
                    "placeholder": "1",
                },
            }
        )
        try:
            selected_kb = knowledge_bases[int(kb_input or "1") - 1]
        except (ValueError, IndexError):
            selected_kb = knowledge_bases[0]

        # Write file to vault
        os.makedirs(self.valves.docs_path, exist_ok=True)
        filepath = os.path.join(self.valves.docs_path, f"{filename}.md")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        await __event_emitter__(
            {"type": "status", "data": {"description": f"Saved {filename}.md — uploading to Knowledge…"}}
        )

        # Upload file and add to knowledge base
        async with httpx.AsyncClient() as client:
            upload_resp = await client.post(
                f"{base_url}/api/v1/files/",
                headers=auth_headers,
                files={"file": (f"{filename}.md", content.encode("utf-8"), "text/markdown")},
            )

            if upload_resp.status_code != 200:
                await __event_emitter__(
                    {
                        "type": "notification",
                        "data": {"type": "error", "content": f"File upload failed: {upload_resp.text}"},
                    }
                )
                return

            file_id = upload_resp.json().get("id")

            kb_add_resp = await client.post(
                f"{base_url}/api/v1/knowledge/{selected_kb['id']}/file/add",
                headers={**auth_headers, "Content-Type": "application/json"},
                json={"file_id": file_id},
            )

        if kb_add_resp.status_code == 200:
            await __event_emitter__(
                {
                    "type": "notification",
                    "data": {
                        "type": "success",
                        "content": f"Saved to ~/vault and added to '{selected_kb['name']}'.",
                    },
                }
            )
        else:
            await __event_emitter__(
                {
                    "type": "notification",
                    "data": {
                        "type": "warning",
                        "content": f"File saved to ~/vault but Knowledge indexing failed: {kb_add_resp.text}",
                    },
                }
            )
