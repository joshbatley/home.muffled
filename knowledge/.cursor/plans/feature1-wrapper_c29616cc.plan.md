---
name: feature1-wrapper
overview: "Scaffold the Next.js wrapper app, implement project selection + “New vs Continue” chat controls, and build the OpenClaw WebSocket chat session layer that streams assistant responses in real time over `18789`. Use TDD: write focused unit tests (mock WS + fs) before implementing each piece."
todos:
  - id: scaffold-next-app
    content: Create `knowledge/command-center` Next.js App Router + TypeScript scaffold (no runtime feature yet). Add `package.json` + minimal page skeleton so later tests have a place to live.
    status: completed
  - id: vitest-rtl-setup
    content: Set up Vitest + React Testing Library in `knowledge/command-center` (jsdom). Add one trivial sample test to confirm the runner works.
    status: completed
  - id: docstore-projects-helper-tests
    content: Implement (tests first) `listProjects(docstoreRoot)` helper that returns immediate child directory names. Test with a temp folder containing files and nested dirs; assert correct filtering.
    status: completed
  - id: projects-api-route-tests
    content: Implement (tests first) `GET /api/projects` API route that reads `OPENCLAW_DOCSTORE_HOST_PATH` (fallback to repo root/current dir) and returns projects. Unit test the route handler by mocking `listProjects`.
    status: completed
  - id: project-selector-ui-tests
    content: Implement (tests first) `ProjectSelector` React component that loads projects from `/api/projects`, supports loading/error states, and emits `onProjectChange(projectName)`. Test with mocked fetch.
    status: completed
  - id: openclaw-protocol-types-tests
    content: Implement (tests first) protocol-level types + frame parser/correlation utilities for the OpenClaw WS wire format (request/response/event). Unit-test parsing/correlation using sample JSON frames from `knowledge/SPEC.md` + OpenClaw protocol docs.
    status: completed
  - id: openclaw-ws-adapter-tests
    content: "Implement (tests first) `OpenClawGatewayClient` with methods needed for Feature 1: `connect`, `ensureSession(project)`, `newChat(project)` (calls `sessions.reset`), and `sendChat({project, text})` (calls `chat.send`). Use a mocked WS server to verify outgoing frames and to simulate incoming `event: \"chat\"` delta/final updates."
    status: completed
  - id: chat-session-state-tests
    content: "Implement (tests first) `ChatSessionController` that manages per-project state: current `sessionKey`, current mode (`new` vs `continue`), and message list updates from `OpenClawGatewayClient` callbacks/iterators. Test that “New chat” resets (clears messages) and “Continue chat” reuses prior messages."
    status: completed
  - id: chat-ui-streaming-tests
    content: Implement (tests first) `ChatPanel` UI that renders user/assistant messages and updates the assistant message text in real time from `chat` delta events. Test with mocked controller emitting delta/final sequences.
    status: completed
  - id: feature1-page-wiring-tests
    content: "Implement (tests first) the wrapper shell page wiring: project selector + chat panel + New/Continue buttons. Test that selecting a project switches controller scope and that clicking New/Continue triggers the correct controller methods."
    status: completed
  - id: compose-docstore-mount
    content: Update `knowledge/docker-compose.yaml` to mount the host document store root into OpenClaw workspace (`/home/node/.openclaw/workspace`) with env var `OPENCLAW_DOCSTORE_HOST_PATH` and default-to-current-dir behavior as specified in `knowledge/SPEC.md`. Add a short doc comment in the plan/code for how to set the env var.
    status: completed
  - id: manual-smoke-verify
    content: Add a minimal manual verification script (or documented checklist in README) that starts the wrapper + openclaw, selects a project, sends a message, and confirms the UI receives streaming `chat` events and updates in real time.
    status: completed
isProject: false
---

## Goal

Deliver Feature 1: “Wrapper app shell + project selection + OpenClaw WS chat session”.

## Key spec requirements (from `knowledge/SPEC.md`)

- Wrapper app connects to OpenClaw Gateway over WebSocket on port `18789`.
- UI has a “Project” dropdown selecting a subfolder under the document store root.
- “New chat” vs “Continue chat” matches spec: new chats default to *no transcript recall*.
- Chat UI renders assistant responses in real time (streaming).

## Proposed implementation approach

1. **Scaffold** a Next.js App Router app at `knowledge/command-center`.
2. **Backend project listing**: implement a server-side helper that enumerates immediate subdirectories of the document store root and expose it to the UI via an API route.
3. **OpenClaw WS adapter**:
  - Implement frame typing/parsing.
  - Implement request/response correlation.
  - Implement methods needed for Feature 1: `sessions.create` (initial session), `sessions.reset` (for New chat), and `chat.send`.
  - Listen for streaming assistant updates via gateway events of type `event: "chat"` with payload matching `ChatEventSchema` (`state: "delta" | "final" | ...`).
4. **Chat session manager**:
  - For each selected project, ensure an OpenClaw session exists.
  - **New chat**: call `sessions.reset` (reason `new`) and clear UI messages.
  - **Continue chat**: do not reset; reuse the existing session key so OpenClaw includes prior turns.
5. **UI shell**:
  - Project dropdown -> chat panel.
  - Buttons: “New chat” / “Continue chat”.
  - Streaming assistant message rendering.

## Data flow diagram

```mermaid
flowchart TD
  UI[Wrapper UI (Next.js)] -->|selectedProject + userText| WSClient[OpenClawGatewayClient (WS adapter)]
  WSClient -->|sessions.create / sessions.reset / chat.send| Gateway[OpenClaw Gateway WS on :18789]
  Gateway -->|event: chat (delta/final)| WSClient
  WSClient -->|streaming message updates| UI
```



## TDD conventions for this feature

- Every new module gets at least one unit test before implementation.
- For WS: use a mocked WebSocket server that sends deterministic gateway frames (`event: "chat"` deltas/final + a predictable reply for request correlation).
- For project listing: use `fs`-backed helpers tested with a temporary directory.

## Integration prerequisites (repo-level)

Feature 1 requires OpenClaw to actually see the document store projects. Add the docstore volume mount to `knowledge/docker-compose.yaml` as described in `knowledge/SPEC.md`. This ensures the dropdown selection corresponds to folders OpenClaw can read when it runs in project scope.
