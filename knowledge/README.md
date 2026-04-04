
# Research Lab: Local-First Agentic Workspace

## What
An autonomous, project-specific research environment that uses a local LLM to turn raw "brain dump" chat sessions into a structured, human-readable library of Markdown research files.

## Why
*   **Frictionless Research:** Eliminates the gap between "having an idea" and "documenting it."
*   **Ownership & Portability:** All research is stored as plain Markdown files. You own your data; it is fully readable and editable without the AI tool.
*   **Context Isolation:** By using separate chats or knowledge bases, the AI's context is scoped to specific projects, preventing context pollution.
*   **Performance:** All heavy processing (LLM inference, file indexing, RAG) runs locally on your Mac server.

## How
The system uses **Open WebUI** as the core interface, backed by **Ollama** running locally on the host. `~/vault` is the authoritative store for any research worth keeping — treat it as the exit strategy: chat is ephemeral, files in the vault are permanent.

### System Architecture
*   **Engine:** Open WebUI (Dockerized)
*   **Brain:** Ollama (local, running on the host at port 11434)
*   **Storage:**
    *   `~/projects/home.muffled/knowledge/storage`: Open WebUI app data, SQLite DB, and uploads (gitignored; created on first run).
    *   `~/vault`: The primary research directory (Source of Truth). Also mounted into the container at `/app/backend/data/docs`.
*   **Accessibility:** Web-based interface on host port **3928** (container listens on 8080; see [`docker-compose.yml`](docker-compose.yml) in this directory).

---

## Setup Guide

### Prerequisites
1. **Docker** (Docker Desktop or Docker Engine) with Compose v2.
2. **Ollama** installed on the host and listening on **11434** with at least one model pulled (e.g. `ollama pull llama3.2`).
3. **Research vault directory:**
    ```bash
    mkdir -p ~/vault
    ```

### Docker Compose
The stack is defined in this directory: [`docker-compose.yml`](docker-compose.yml). Open WebUI state lives under `storage/` (gitignored).

### Launch & Configuration
1.  **Start the service:**
    ```bash
    cd ~/projects/home.muffled/knowledge
    docker compose up -d
    ```
2.  **Web access:** Open **`http://localhost:3928`** locally, or **`http://<YOUR_LAN_IP>:3928`** from another device. (Port **8080** is used inside the container only.)
3.  **First-time wizard:**
    *   Create an admin account when prompted.
    *   Open **Settings → Connections** and confirm the Ollama URL is set to `http://host.docker.internal:11434` (pre-configured via the environment variable; verify it shows your models).
    *   On **Linux** without Docker Desktop, if `host.docker.internal` doesn't resolve, use the Docker host gateway IP (often `172.17.0.1`).
4.  **Using the vault:**
    *   Files under `~/vault` are accessible inside the container at `/app/backend/data/docs`. You can upload/embed them via Open WebUI's **Knowledge** or **Documents** features.
    *   Treat `~/vault` as the source of truth: save any research worth keeping there (copy from chat, export, or agent-save), so it's editable and movable independently of the app.
