# portal

Shell host frontend (Module Federation **host**).

## Responsibilities

- owns top-level routing and shell frame
- owns `SessionProvider` from `@home/auth`
- loads `usersRemote` at runtime (`remoteEntry.js` from `:5174`)
- shares `react`, `react-dom`, `react-router-dom`, `@home/auth` as singletons via `lib/mf-shared.ts`

## Run (integrated — users UI through portal)

Requires platform, built `@home/auth`, and **both** Vite dev servers (`@module-federation/vite` integrated model).

```bash
make platform-up
make platform-migrate
make auth-build          # once, or after lib/auth changes

# terminal 1 — start first
make dev-users           # :5174 remote (remoteEntry.js)

# terminal 2
make dev-portal          # :5173 host — open this in the browser
```

Copy `portal/.env.example` → `portal/.env` and `users/.env.example` → `users/.env` (match `ANON_KEY` from `platform/.env`).

Dev remote entry defaults to `http://localhost:5174/remoteEntry.js`.

## Production

Portal and users deploy **independently**. Build portal with the deployed users `remoteEntry.js` URL — it is baked in at build time.

```bash
# 1. Deploy users (serves dist/ including remoteEntry.js + assets; CORS required)
make users-build
# deploy users/dist → https://users.example.com

# 2. Build portal against that remote
VITE_USERS_REMOTE_ENTRY=https://users.example.com/remoteEntry.js make portal-build-prod
# deploy portal/dist → https://portal.example.com
```

Local production simulation (built assets, no HMR):

```bash
make preview-all    # users preview :5174, portal preview :5173
```

Or `make dev-all` for integrated dev.

## Routes (after login)

| Path | Source |
|---|---|
| `/me` | users remote |
| `/users`, `/users/:id`, `/rbac` | users remote (admin) |
| `/login`, shell nav | portal |

## muffled.ui components

Registry: `@muffled` in `components.json`. Update a component in **portal** and **users** (same names in both apps):

```bash
cd portal
bunx shadcn@latest add @muffled/<name> -y -o --overwrite

cd ../users
bunx shadcn@latest add @muffled/<name> -y -o --overwrite
```

Each app owns its own Tailwind pipeline and `index.css`.
