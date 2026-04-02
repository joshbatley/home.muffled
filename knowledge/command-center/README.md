# Command Center Local Run + Smoke Check

## One-time setup

1. Install dependencies:
   - `cd knowledge/command-center`
   - `pnpm install`
2. Ensure local projects folder exists:
   - `mkdir -p ../projects`

## Run locally

1. Start OpenClaw:
   - `cd knowledge`
   - Optional model overrides (local):
     - `export OLLAMA_HOST=http://host.docker.internal:11434`
     - `export OLLAMA_MODEL=ollama/glm-4.7-flash:latest`
     - `export OLLAMA_API_KEY=ollama-local`
   - `docker compose up -d openclaw`
2. Start wrapper app:
   - `cd command-center`
   - `pnpm dev`
3. Open `http://localhost:3000`.

## Smoke test

1. Verify project dropdown loads folders from `knowledge/projects`.
2. Select a project and send a chat message.
3. Confirm assistant output updates in real time.
4. Click `New chat` and confirm message list clears.
5. Click `Continue chat`, send another message, and confirm prior messages remain.
6. Run tests:
   - `pnpm test`
