# portal

Shell host frontend.

## Responsibilities

- owns top-level routing and shell frame
- owns `SessionProvider` from `@home/auth`
- loads users domain from `users/src` in the same Vite graph (shared React; no runtime federation)

## Run

Start `platform` (Supabase), apply migrations, then frontends:

```bash
make platform-up
make platform-migrate
make dev
```

Copy `portal/.env.example` → `portal/.env` and `users/.env.example` → `users/.env` (match `ANON_KEY` from `platform/.env`).

```bash
make dev-portal   # :5173 (includes users UI)
make dev-users    # :5174 (optional — standalone users app only)
```

## muffled.ui components

Registry: `@muffled` in `components.json`. Update a component in **portal** and **users** (same names in both apps):

```bash
cd portal
bunx shadcn@latest add @muffled/<name> -y -o --overwrite

cd ../users
bunx shadcn@latest add @muffled/<name> -y -o --overwrite
```

Run `@muffled/theme` when refreshing tokens; component adds may merge `index.css` (portal keeps `@source "../../users/src"` in that file).
