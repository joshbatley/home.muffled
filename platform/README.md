# platform

Self-hosted Supabase (Auth + Postgres + PostgREST + Edge Functions).

## Prerequisites

- Docker Desktop
- Copy `.env.example` → `.env` and set secrets (`sh utils/generate-keys.sh` in upstream Supabase docker docs, or use demo keys for local-only)

## URLs (default)

| Service | URL |
|---------|-----|
| API (Kong) | http://localhost:8000 |
| Studio | http://localhost:54323 |
| REST | http://localhost:8000/rest/v1/ |
| Auth | http://localhost:8000/auth/v1/ |
| Edge Functions | http://localhost:8000/functions/v1/ |

## Commands

From repo root:

```bash
make platform-up      # start stack
make platform-down    # stop stack
make platform-logs    # follow logs
make platform-migrate # apply SQL migrations (stack must be up)
```

## Frontend env

Use keys from `platform/.env` (`ANON_KEY`, `SUPABASE_PUBLIC_URL`):

```bash
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=<ANON_KEY from platform/.env>
```

## Wave 3 contracts

- RPC: `get_my_permissions()` → `{ roles: string[], permissions: string[], force_password_change: boolean }`
- Edge: `POST /functions/v1/admin-create-user` body `{ email, password, role_ids: string[] }`
- Profile table: `public.profiles` keyed by `auth.users.id`

## Vendor files

`volumes/api`, `volumes/db`, etc. are from [Supabase docker](https://github.com/supabase/supabase/tree/master/docker). Re-run `platform/bootstrap-vendor.sh` after upstream upgrades.

## SMTP (Google Workspace)

In `.env`: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, app password, `SMTP_ADMIN_EMAIL`, `SITE_URL=http://localhost:5173`.
