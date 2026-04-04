
# Research Lab: Local-First Agentic Workspace

## What
An autonomous, project-specific research environment that uses a local LLM to turn raw "brain dump" chat sessions into a structured, human-readable library of Markdown research files.

## Why
*   **Frictionless Research:** Eliminates the gap between "having an idea" and "documenting it."
*   **Ownership & Portability:** All research is stored as plain Markdown files. You own your data; it is fully readable and editable without the AI tool.
*   **Context Isolation:** By using "Workspaces," the AI’s memory is scoped to specific projects (e.g., Flight APIs vs. Game Mechanics), preventing context pollution.
*   **Performance:** All heavy processing (LLM inference, file indexing, RAG) runs locally on your Mac server.

## How
The system uses **AnythingLLM** as the core orchestration engine. It treats your `~/vault` directory as a "living library." When you chat, the AI retrieves context from existing project files and uses an automated flow to write new research directly into your file system as Markdown.

### System Architecture
*   **Engine:** AnythingLLM (Dockerized)
*   **Brain:** Ollama (Local API integration)
*   **Storage:**
    *   `~/projects/home.muffled/knowledge`: App configuration and Vector Database.
    *   `~/vault`: The primary research directory (Source of Truth).
*   **Accessibility:** Web-based interface on host port **3928** (container listens on 3001; see [`docker-compose.yml`](docker-compose.yml) in this directory).

---

## Setup Guide

### Prerequisites
1. **Docker** (Docker Desktop or Docker Engine) with Compose v2.
2. **Ollama** installed on the host and listening on **11434** before you configure AnythingLLM.
3. **Research vault directory:** create it once so the bind mount target is explicit (Docker may also create missing host paths on first run):
    ```bash
    mkdir -p ~/vault
    ```

### Docker Compose
The stack is defined in this app directory: [`docker-compose.yml`](docker-compose.yml) (`~/projects/home.muffled/knowledge/docker-compose.yml`). Review or adjust volumes there if your paths differ.

### Launch & Configuration
1.  **Start the service:**
    ```bash
    cd ~/projects/home.muffled/knowledge
    docker compose up -d
    ```
2.  **Web access:** Open **`http://localhost:3928`** on the machine running Docker, or **`http://<YOUR_LAN_IP>:3928`** from another device on your network. (Port **3001** is only used inside the container.)
3.  **Engine sync:**
    *   **LLM provider:** Set the Ollama base URL to `http://host.docker.internal:11434` (Docker Desktop on macOS/Windows). On **Linux**, use your host’s gateway IP toward Docker (often `172.17.0.1`) or another address that reaches Ollama on the host, unless your Docker version supports `host.docker.internal`.
    *   **Workspace management:** Create separate workspaces for each project. AnythingLLM maps these to sub-folders under `~/vault`.
    *   **Agent flow:** Use the chat to brainstorm. At the end of a session, request a formal Markdown summary; output can be written under `~/vault` for permanent recall.
