# portal

Shell host frontend.

## Responsibilities

- owns top-level routing and shell frame
- owns auth provider placement using `@home/auth-ts`
- loads users domain via module federation remote (`usersRemote/UsersRoutes`)

## Run

Start `users/web` first, then start `portal`:

```bash
make dev-users-web   # :5174
make dev-portal      # :5173
# or: make dev-fe
```

Ensure the API is running (`make -C users run`) on `:8080`.
