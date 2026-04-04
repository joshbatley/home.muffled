"""
title: Save to Knowledge
author: home.muffled
version: 1.1.0
required_open_webui_version: 0.5.0
"""

import asyncio
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
        __model__=None,
    ):
        try:
            return await self._run(body, __user__, __event_emitter__, __event_call__, __request__, __model__)
        except Exception:
            import traceback
            await __event_emitter__(
                {"type": "notification", "data": {"type": "error", "content": traceback.format_exc()[-500:]}}
            )

    async def _run(self, body, __user__, __event_emitter__, __event_call__, __request__, __model__=None):
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

        def safe_json(resp):
            try:
                return resp.json()
            except Exception:
                return None

        # Extract knowledge bases from __model__ (injected by Open WebUI)
        knowledge_bases = []
        if __model__:
            meta = (
                (__model__.get("info") or {}).get("meta") or
                __model__.get("meta") or
                {}
            )
            kb_refs = meta.get("knowledge", []) if isinstance(meta, dict) else []
            for ref in kb_refs:
                if isinstance(ref, dict) and ref.get("id"):
                    knowledge_bases.append(ref)

        if not knowledge_bases:
            await __event_emitter__(
                {
                    "type": "notification",
                    "data": {
                        "type": "error",
                        "content": "No knowledge base attached to this model. Go to Workspace → Models → your model → add a Knowledge base.",
                    },
                }
            )
            return

        # Only one KB supported per model — use it directly
        selected_kb = knowledge_bases[0]

        # Prompt: filename only
        slug = re.sub(r"[^\w\s-]", "", content[:50]).strip().replace(" ", "-").lower()
        default_name = f"{datetime.now().strftime('%Y-%m-%d')}-{slug}"

        filename_input = await __event_call__(
            {
                "type": "input",
                "data": {
                    "title": "Save to Knowledge",
                    "message": f"Filename (without .md) — saving to '{selected_kb['name']}':",
                    "placeholder": default_name,
                },
            }
        )
        filename_str = filename_input if isinstance(filename_input, str) else ""
        filename = filename_str.strip().removesuffix(".md") or default_name

        # Write file to vault/{knowledge-name}/filename.md
        kb_folder = re.sub(r"[^\w\s-]", "", selected_kb["name"]).strip().replace(" ", "-").lower()
        save_dir = os.path.join(self.valves.docs_path, kb_folder)
        os.makedirs(save_dir, exist_ok=True)
        with open(os.path.join(save_dir, f"{filename}.md"), "w", encoding="utf-8") as f:
            f.write(content)

        await __event_emitter__(
            {"type": "status", "data": {"description": f"Saved {filename}.md — indexing into Knowledge…"}}
        )

        # Upload, process, then add to knowledge base
        async with httpx.AsyncClient() as client:
            upload_resp = await client.post(
                f"{base_url}/api/v1/files/",
                headers=auth_headers,
                files={"file": (f"{filename}.md", content.encode("utf-8"), "text/plain")},
            )

            if upload_resp.status_code != 200:
                await __event_emitter__(
                    {"type": "notification", "data": {"type": "warning", "content": f"File saved to vault but upload failed: {upload_resp.text}"}}
                )
                return

            file_id = (safe_json(upload_resp) or {}).get("id")

            await client.post(f"{base_url}/api/v1/files/{file_id}/process", headers=auth_headers)
            await asyncio.sleep(2)

            kb_add_resp = await client.post(
                f"{base_url}/api/v1/knowledge/{selected_kb['id']}/file/add",
                headers={**auth_headers, "Content-Type": "application/json"},
                json={"file_id": file_id},
            )

        if kb_add_resp.status_code == 200:
            await __event_emitter__(
                {"type": "notification", "data": {"type": "success", "content": f"Saved to ~/vault/{kb_folder}/{filename}.md and indexed into '{selected_kb['name']}'."}}
            )
        else:
            await __event_emitter__(
                {"type": "notification", "data": {"type": "warning", "content": f"Saved to vault but Knowledge indexing failed: {kb_add_resp.text}"}}
            )
