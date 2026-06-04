#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
BASE="https://raw.githubusercontent.com/supabase/supabase/master/docker"
files=(
  volumes/api/kong.yml
  volumes/api/kong-entrypoint.sh
  volumes/db/realtime.sql
  volumes/db/webhooks.sql
  volumes/db/roles.sql
  volumes/db/jwt.sql
  volumes/db/_supabase.sql
  volumes/db/logs.sql
  volumes/db/pooler.sql
  volumes/logs/vector.yml
  volumes/pooler/pooler.exs
  volumes/functions/main/index.ts
)
for f in "${files[@]}"; do
  mkdir -p "$(dirname "$f")"
  curl -fsSL "$BASE/$f" -o "$f"
  echo "fetched $f"
done
mkdir -p volumes/db/data volumes/snippets
echo "Done."
