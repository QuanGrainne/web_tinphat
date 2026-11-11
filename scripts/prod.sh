#!/usr/bin/env bash
# Docker Compose for the VPS: the base stack plus the production overrides, with deploy/.env.
#
#   bash scripts/prod.sh up -d --build     start or update the site
#   bash scripts/prod.sh ps                what is running
#   bash scripts/prod.sh logs -f api       follow the API log
#   bash scripts/prod.sh restart caddy     reload the proxy (after a new certificate)
#
# Never add -v to "down": it deletes the database and every uploaded picture.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for arg in "$@"; do
  if [ "$arg" = "-v" ] || [ "$arg" = "--volumes" ]; then
    echo "refused: $arg would delete the database and the pictures" >&2
    exit 1
  fi
done

exec docker compose \
  -f "$ROOT/deploy/compose.yml" \
  -f "$ROOT/deploy/compose.prod.yml" \
  --env-file "$ROOT/deploy/.env" \
  "$@"
