# Knowledge Base App Spec

## Goals
1. Provide a “Cursor-like” web experience where you can select a project and chat with an AI to:
   - answer questions from project markdown docs (no required chat history)
   - brainstorm and plan new work
   - research the web and cite sources
   - generate/update markdown files on disk
2. Make generated and curated knowledge durable on disk as plain markdown (so it can be viewed/edited outside the app).
3. Ensure file writes are human-in-the-loop: when the AI wants to create/edit markdown, the UI asks for approval with a “create this file / apply these edits” style prompt.

## Non-goals (for the initial version)
- No semantic “global wiki” across all projects unless/until indexing and scoping are fully defined.
- No Slack integration or tooling beyond a future attach point.
- No complex role/permission system; assume a single trusted operator.

## Terminology
- **Document store root**: the host folder mounted into OpenClaw. It contains project subfolders directly.
  - Host location (selected): `knowledge/projects`
  - Container location (target): `/home/node/.openclaw/workspace/<projectName>/...`
- **Project**: one immediate subdirectory inside the document store root, selected from the UI.
- **Workspace**: the OpenClaw workspace path (inside the container) used by filesystem tools.
- **Chat transcript**: a short-lived brainstorming thread, stored as markdown on disk.
- **Implementation/runtime root**: OpenClaw runtime state and config stored at `knowledge/.openclaw` (not part of exported project data).

## User Experience (main flows)
### 1) New chat (brainstorming mode)
1. Open the web app.
2. Select a project.
3. Start a new chat window.
4. Default retrieval behavior:
   - Do **not** recall previous chat transcripts for retrieval.
   - Use project docs as the primary knowledge source.
   - Use web search when needed for “up to date” research.
5. If the AI proposes file creation/edit:
   - show an approval modal
   - apply only after explicit approval

### 2) Continue chat (optional recall)
When you explicitly choose to continue an existing conversation, that chat’s prior turns may be used as additional context. It remains short-lived compared to long-term docs.

### 3) Ask later (knowledge Q&A)
You can start a new chat window later and ask questions that should be answered from:
- the current project’s markdown docs (and any files the AI created earlier)
- optional web research

## High-level Architecture
- **Wrapper web app (custom UI)**: Next.js (React)
  - project selector
  - file tree / editor UI (markdown)
  - approval UI for file write/edit operations
  - chat UI
  - calls OpenClaw gateway for agent execution + tool invocations
- **OpenClaw gateway + agent brain**: runs inside Docker
  - filesystem tools: `read` for context; `write`/`edit`/`apply_patch` gated behind approvals
  - web tools: `web_search` and `web_fetch` (OpenClaw-owned)
  - project-scoped doc retrieval (via one of the approaches in “Open Questions / TBD”)

```mermaid
flowchart TD
  WrapperUI[Wrapper UI (Next.js)] -->|"chat prompt + project scope"| OpenClawGateway[OpenClaw Gateway (WS)]
  OpenClawGateway --> AgentBrain[Agent Brain]
  AgentBrain --> ProjectScope[Project Scoping]
  ProjectScope -->|"search/query"| DocRetrieval[Doc Retrieval (project scoped)]
  AgentBrain -->|"read relevant files"| FilesystemRead[Filesystem read tool]
  AgentBrain -->|"needs up-to-date info"| WebTools[web_search/web_fetch]
  WebTools --> AgentBrain
  AgentBrain -->|"wants to write markdown"| WriteOrEdit[write/edit/apply_patch tool call]
  WriteOrEdit --> Approval[Approval gate in UI]
  Approval -->|"allow"| WriteOrEdit
  Approval -->|"deny"| AgentBrain
  FilesystemRead --> WrapperUI
```

## On-disk Layout (project scoped)
### Document store root
The host document store root contains immediate project subfolders:

```text
<documentStoreRoot>/
  <projectName>/
    docs/                 (design docs, brand guidelines, requirements, decisions)
    specs/                (specifications created by AI or by you)
    generated/           (AI-generated or AI-updated docs)
    chats/
      <chatId>.md        (transcript files)
    assets/              (optional; images, etc; usually ignored by index)
    .metadata/          (optional; index hints, manifest files)
```

### Minimum convention (recommended)
- Each project should have a `docs/PROJECT_OVERVIEW.md` (or `docs/README.md`) that acts as an entry point for first-pass retrieval.
- AI-generated markdown should include a short frontmatter block with:
  - `title`
  - `createdAt` / `updatedAt`
  - `source` (e.g. `chat:<chatId>` or `task:<id>`)

## Docker / Mounting Model
OpenClaw must be able to read markdown files from the mounted document store root.

### Container mount target (selected)
Projects appear inside OpenClaw at:
- `/home/node/.openclaw/workspace/<projectName>/...`

### Current state (implemented)
`knowledge/docker-compose.yaml` mounts:
- `knowledge/.openclaw` -> `/home/node/.openclaw` (runtime/config only)
- `knowledge/projects` -> `/home/node/.openclaw/workspace` (exported project docs only)

This keeps implementation/runtime files separate from project data.

## Chat Scoping Rules
### New chat default (no transcript recall)
- Retrieval must ignore prior chat transcripts by default.
- Only project docs + web research are used unless the user explicitly continues an existing chat.

### Continue chat
- When continuing a chat, include that chat transcript as context (and optionally index it for later recall if desired later).

## Retrieval + Indexing Strategy (project-scoped)
Project selection must translate into retrieval constraints so a question like:
> “In the X project what service did we decide on?”
searches only within the selected project folder.

### Required capabilities
1. Fast project-scoped search across markdown files.
2. Ability for the agent to retrieve relevant snippets or full sections before answering.
3. Retrieval corpus must exclude implementation/runtime files by design; only files under `knowledge/projects/<projectName>/...` are in scope.

### Implementation approach (to be finalized in “Open Questions / TBD”)
Two viable approaches exist; the spec includes the selection criteria:

Approach A (preferred for this UI): **Project collections via QMD**
- Use `qmd-local-search` (or QMD-backed memory) to create a named collection per project.
- The agent (or wrapper) uses that collection based on selected project.
- Pros: natural mapping to “project selection”; no runtime config switching.
- Cons: must confirm tool/skill availability and how to run/maintain collections in the container.

Approach B: **Index everything under workspace, then filter**
- Configure one index for all projects mounted into the workspace and filter results by prefix `<projectName>/`.
- Pros: simpler initial setup.
- Cons: prefix filtering quality and UX depends on retrieval tool semantics.

### Ranking / recall expectations
- For “decision” questions, prefer retrieval of:
  - meeting notes
  - architecture/design docs
  - `DECISIONS.md` (if you adopt it)
  - “final” sections of specs
- If multiple conflicting answers are found, responses should:
  - cite which files they came from
  - explain the contradiction briefly

## Web Research
Web research should be owned by OpenClaw agent tools:
- `web_search` to find sources
- `web_fetch` to read content

### Source attribution in the UI
- The wrapper should display citations/URLs returned by OpenClaw.
- When OpenClaw returns multiple sources, the UI should show them in a collapsible “Sources” section.

## Tool Execution + Human-in-the-loop Approval
File writes must always be gated behind approval.

### Allowed automatically
- Read-only tool calls:
  - `read` from the workspace
  - retrieval/search tools (document search)
  - web search/fetch

### Requires explicit approval in the UI
- `write`, `edit`, `apply_patch`
- `delete` (if ever supported/enabled)

### UI requirements (Cursor-like)
When the agent proposes a file operation:
1. The UI should show:
   - target path(s)
   - proposed diff or “new file contents”
2. The UI should present:
   - “Create file” / “Apply changes” button
   - “Reject” button
3. On rejection, the agent should be allowed to:
   - try again with a safer change
   - or respond without making writes

### How approvals connect to OpenClaw
OpenClaw supports approval mechanisms via a `requireApproval` pattern in the tool pipeline.

OpenClaw connector responsibilities for the wrapper:
- detect approval requests coming from the gateway
- map them to UI modals
- resolve allow/deny back to the gateway

## Security Model
1. Secrets (LLM keys for providers, tokens) must remain server-side in OpenClaw.
2. Wrapper must not log secrets.
3. Filesystem access must be restricted to the mounted workspace root.
4. Default fail-closed behavior:
   - if approvals cannot be shown, the tool call should be denied.

## Future Slack Attach Point (non-blocking)
Later, you will attach OpenClaw to Slack so you can ask questions like:
- “In the X project what service did we decide on?”

This spec assumes:
- project selection exists in Slack context (e.g. a command like `/project X`)
- approvals still occur (either via Slack interactive messages or an alternate admin flow)

## Acceptance Criteria
1. Project selection restricts retrieval to that project’s folder.
2. New chat answers correctly from project docs even when chat has no prior history.
3. When the AI requests creating/updating markdown, the wrapper shows an approval modal before the filesystem changes.
4. If approval is denied, no file modifications occur.
5. Web research works and sources are shown.
6. Transcripts are stored as markdown under `chats/` within the correct project.

## Open Questions / TBD
1. OpenClaw retrieval tool selection:
   - Confirm whether we should use `qmd-local-search` directly (project collections) or OpenClaw’s QMD memory backend.
2. OpenClaw gateway contract for the wrapper:
   - Which websocket message types + payload schema the wrapper must use for:
     - starting a chat
     - receiving tool calls
     - handling `requireApproval` requests
3. Docker env var naming + defaults:
   - Confirm the exact env var name for the host document store root (spec suggests adding `OPENCLAW_DOCSTORE_HOST_PATH`).
   - Confirm what “current dir” means in compose terms (repo root, `knowledge/`, or something else).
4. Index update strategy:
   - When files change, when and how do we refresh indexes/collections (on startup, on demand, or periodically)?
5. Which markdown paths should be indexed:
   - `docs/` and `specs/` only, or include `generated/` and `chats/` too?

## MVP Features (Jira-ready)

### Feature 1: Wrapper app shell + project selection + OpenClaw WS chat session
In scope
- Next.js app loads and connects to OpenClaw gateway via WebSocket on `18789`
- Local UI dev server runs on `3077`
- “Project” dropdown selects a subfolder under the document store root
- New chat starts a short-lived session using the selected project scope
- New chats do not recall prior chat transcripts by default

Acceptance criteria
1. Selecting project `X` and sending a new question results in the agent operating in scope `X`.
2. Chat UI renders assistant responses in real time.
3. “New chat” vs “Continue chat” behavior matches spec (no transcript recall by default).

### Feature 2: Project-scoped retrieval (QMD) for “no chat history” answers
In scope
- Use `qmd-local-search` for project-scoped retrieval
- Retrieval runs inside the OpenClaw agent (OpenClaw owns running the `qmd-local-search` logic)
- Wrapper passes the user prompt + selected project scope; OpenClaw retrieves within that project
- Wrapper must use the gateway-supported `chat.send` payload contract (no unsupported custom params)
- Project scope means markdown under the selected project directory (file naming is unconstrained)

Acceptance criteria
1. In a new chat, questions like “In project X what service did we decide on?” are answered from `X` docs.
2. Answers include citations/sources surfaced in the UI.

### Feature 3: File browser + markdown viewer/editor (selected project)
In scope
- UI shows:
  - project tree
  - file tree for the selected project (at least markdown)
  - opened file markdown viewer/editor
- Wrapper reads file listing from the mounted docstore root on disk
- Manual edits are allowed

Acceptance criteria
1. Switching projects updates file tree and editor context.
2. Opening markdown files renders correctly.
3. Manual edits save immediately to disk.

### Feature 4: AI write approval UX + write allowlist (selected project only)
In scope
- When the agent proposes `write`/`edit`/`apply_patch`:
  - show approval modal with target path(s)
  - show proposed changes (diff or full content)
  - “Approve” applies changes; “Reject” results in no write
- Enforce write allowlist: agent writes are restricted to the selected project directory

Acceptance criteria
1. Approving applies changes to disk only inside the selected project.
2. Rejecting prevents any filesystem modification.
3. If the agent attempts to write outside the selected project, the wrapper denies the operation.

### Feature 5: Transcript persistence + transcript list UI per project
In scope
- Save generated chat transcripts as markdown under the selected project
- UI lists transcripts for the selected project
- “Continue” a transcript loads it as context

Acceptance criteria
1. New chats create a new transcript file under `/<project>/chats/<chatId>.md`.
2. Transcript list is project-scoped.
3. Continue uses the selected transcript as context.

### Feature 6: Web research integration with sources in the UI
In scope
- Allow the agent to use OpenClaw web tools: `web_search` and `web_fetch`
- Wrapper renders citations/sources returned by OpenClaw

Acceptance criteria
1. When web research is used, sources are visible in the UI.

## Implemented QoL (non-blocking)
- Project selector remembers the last selected project locally (`localStorage`).
- Model selector loads available models from local Ollama (`/api/tags`) and can set the selected model.
- Model preference is remembered locally and can be reapplied on load.
- Health widget checks OpenClaw `/health` on load and every 30 seconds with status states:
  - `up` (green)
  - `starting` (yellow)
  - `down` (red)

