# users

Federated remote frontend for users domain screens.

## Responsibilities

- exposes `./UsersRoutes` for host consumption
- uses `@home/auth` (shared singleton with portal)
- admin UI talks to PostgREST + Edge Functions on platform

## Run

Run this app before `portal` so the host can load the remote entry.

```bash
cd users && bun run dev   # :5174
```

Copy `users/.env.example` → `.env`.
