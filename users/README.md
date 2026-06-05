# users

Federated remote frontend for users domain screens.

## Responsibilities

- Module Federation **remote** (`usersRemote`): exposes `./MePage`, `./UsersPage`, `./UserEditorPage`, `./RolesPermissionsPage`
- uses `@home/auth` (shared singleton with portal — must be built: `make auth-build`)
- admin UI talks to PostgREST + Edge Functions on platform
- runs standalone via `src/main.tsx` + `src/index.css` (own Tailwind pipeline)

## Run

### Integrated (consumed by portal)

Start **before** portal so the host can load `remoteEntry.js`:

```bash
make auth-build          # once, or after lib/auth changes
make dev-users           # :5174
```

Then in another terminal: `make dev-portal` → open http://localhost:5173

### Standalone (users-only dev, full HMR)

```bash
make dev-users
# open http://localhost:5174
```

Copy `users/.env.example` → `.env`.

## Production

Users deploys as a static remote. Portal loads `remoteEntry.js` and chunk assets from this origin at runtime.

```bash
make users-build
# deploy users/dist → https://users.example.com
```

Production server/CDN must serve `remoteEntry.js` and `assets/*` with **CORS** enabled — portal loads these cross-origin. `vite preview` sets this for local testing (`make users-preview`).

Deploy users **before** building portal so you know the `remoteEntry.js` URL.
