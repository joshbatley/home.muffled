# `@home/auth`

Shared Supabase session + client for portal and federated remotes.

- `supabase` — browser client singleton
- `SessionProvider` / `useSession` — auth + `get_my_permissions` RPC
- `hasRole`, `hasPermission` — UI helpers

Admin-only calls (e.g. edge functions) live in `users`, not here.
