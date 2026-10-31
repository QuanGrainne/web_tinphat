#!/usr/bin/env bash
# Dump the database to data/backups/dna-YYYYmmdd-HHMM.dump (pg_dump custom format).
#
#   scripts/backup.sh
#
# BACKUP_DIR overrides the target directory. Old dumps are not pruned.
# Restore: see "Backup and restore" in docs/deployment-guide.md.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/deploy/compose.yml" --env-file "$ROOT/deploy/.env")
OUT_DIR="${BACKUP_DIR:-$ROOT/data/backups}"
OUT="$OUT_DIR/dna-$(date +%Y%m%d-%H%M).dump"
PARTIAL="$OUT.partial"

mkdir -p "$OUT_DIR"
trap 'rm -f "$PARTIAL"' EXIT

# user and database come from the container's own environment
"${COMPOSE[@]}" exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$PARTIAL"

# custom-format archives start with the PGDMP magic; anything else is an error message
if [ "$(head -c 5 "$PARTIAL")" != "PGDMP" ]; then
  echo "backup failed: output is not a pg_dump archive" >&2
  exit 1
fi

mv "$PARTIAL" "$OUT"
echo "backup written: $OUT ($(wc -c < "$OUT") bytes)"
