# portal

Shell host frontend.

## Responsibilities

- owns top-level routing and shell frame
- owns `SessionProvider` from `@home/auth`
- loads users domain via module federation remote (`usersRemote/UsersRoutes`)

## Run

Start `platform` (Supabase), apply migrations, then frontends:

```bash
make platform-up
make platform-migrate
make dev
```

Copy `portal/.env.example` → `portal/.env` and `users/.env.example` → `users/.env` (match `ANON_KEY` from `platform/.env`).

```bash
make dev-users    # :5174
make dev-portal   # :5173
```
