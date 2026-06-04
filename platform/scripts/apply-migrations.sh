#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Copy .env.example to .env first" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h localhost \
  -p "${POSTGRES_HOST_PORT:-5432}" \
  -U postgres \
  -d "${POSTGRES_DB:-postgres}" \
  -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20260101000000_rbac.sql

if [[ -f supabase/seed.sql ]]; then
  PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h localhost \
    -p "${POSTGRES_HOST_PORT:-5432}" \
    -U postgres \
    -d "${POSTGRES_DB:-postgres}" \
    -v ON_ERROR_STOP=1 \
    -f supabase/seed.sql
fi

echo "Migrations applied."
