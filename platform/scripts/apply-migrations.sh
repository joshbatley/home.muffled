#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Copy .env.example to .env first" >&2
  exit 1
fi
env_get() {
  grep -E "^${1}=" .env 2>/dev/null | head -1 | cut -d= -f2- || true
}

POSTGRES_PASSWORD="$(env_get POSTGRES_PASSWORD)"
POSTGRES_HOST_PORT="$(env_get POSTGRES_HOST_PORT)"
POSTGRES_DB="$(env_get POSTGRES_DB)"

run_psql() {
  local file="$1"
  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
      -h localhost \
      -p "${POSTGRES_HOST_PORT:-5432}" \
      -U postgres \
      -d "${POSTGRES_DB:-postgres}" \
      -v ON_ERROR_STOP=1 \
      -f "${file}"
    return
  fi
  docker exec -i supabase-db psql \
    -U postgres \
    -d "${POSTGRES_DB:-postgres}" \
    -v ON_ERROR_STOP=1 \
    < "${file}"
}

run_psql supabase/migrations/20260101000000_rbac.sql

if [[ -f supabase/seed.sql ]]; then
  run_psql supabase/seed.sql
fi

echo "Migrations applied."
