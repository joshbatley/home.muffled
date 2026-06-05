# `@home/auth`

Shared Supabase session + client for portal and federated remotes.

Built to `dist/` before frontend dev (like `@module-federation/vite` shared-ui pattern). Federation shares this package as a singleton so `SessionProvider` / `useSession` use one React Context across host and remote.

- `supabase` — browser client singleton
- `SessionProvider` / `useSession` — auth + `get_my_permissions` RPC
- `hasRole`, `hasPermission` — UI helpers

```bash
cd lib/auth && bun run build   # or: make auth-build
```

Admin-only calls (e.g. edge functions) live in `users`, not here.
