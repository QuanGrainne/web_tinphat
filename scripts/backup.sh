#!/usr/bin/env bash
# Back up the database and the uploaded pictures:
#   data/backups/dna-YYYYmmdd-HHMM.dump        database (pg_dump custom format)
#   data/backups/uploads-YYYYmmdd-HHMM.tar.gz  every file in the uploads volume (product and category pictures)
#
#   scripts/backup.sh
#
# Environment (all optional):
#   BACKUP_DIR      target directory                          (default: data/backups)
#   KEEP_DAYS       local backups older than this are deleted (default: 14)
#   BACKUP_REMOTE   rclone destination for an off-site copy, e.g. r2:tinphat-backups or gdrive:tinphat-backups.
#                   Needs rclone installed and configured on the server. Remote copies older than KEEP_DAYS are
#                   deleted too. Without it the backups stay on this machine only.
#
# Run it every night from cron, see "Backup and restore" in docs/deployment-guide.md, which also shows the restore.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/deploy/compose.yml" --env-file "$ROOT/deploy/.env")
OUT_DIR="${BACKUP_DIR:-$ROOT/data/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M)"
DUMP="$OUT_DIR/dna-$STAMP.dump"
UPLOADS="$OUT_DIR/uploads-$STAMP.tar.gz"

case "$KEEP_DAYS" in ''|*[!0-9]*) echo "KEEP_DAYS must be a whole number of days" >&2; exit 1 ;; esac

mkdir -p "$OUT_DIR"
trap 'rm -f "$DUMP.partial" "$UPLOADS.partial"' EXIT

# 1. database; user and database come from the container's own environment
"${COMPOSE[@]}" exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DUMP.partial"
# custom-format archives start with the PGDMP magic; anything else is an error message
if [ "$(head -c 5 "$DUMP.partial")" != "PGDMP" ]; then
  echo "backup failed: database output is not a pg_dump archive" >&2
  exit 1
fi
mv "$DUMP.partial" "$DUMP"
echo "database backup:  $DUMP ($(wc -c < "$DUMP") bytes)"

# 2. pictures; the api container mounts the uploads volume at /app/uploads
# inside sh -c, so no shell (Git Bash included) rewrites the container path
"${COMPOSE[@]}" exec -T api sh -c 'exec tar -C /app/uploads -czf - .' > "$UPLOADS.partial"
if ! gzip -t "$UPLOADS.partial" 2>/dev/null; then
  echo "backup failed: the pictures archive is not a valid tar.gz" >&2
  exit 1
fi
mv "$UPLOADS.partial" "$UPLOADS"
echo "pictures backup:  $UPLOADS ($(wc -c < "$UPLOADS") bytes)"

# 3. drop local backups older than KEEP_DAYS
find "$OUT_DIR" -maxdepth 1 -type f \( -name 'dna-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -print -delete \
  | sed 's/^/removed old backup: /'

# 4. optional off-site copy; a failure here fails the run, so cron reports it
if [ -n "${BACKUP_REMOTE:-}" ]; then
  if ! command -v rclone > /dev/null; then
    echo "backup failed: BACKUP_REMOTE is set but rclone is not installed" >&2
    exit 1
  fi
  rclone copy "$DUMP" "$BACKUP_REMOTE"
  rclone copy "$UPLOADS" "$BACKUP_REMOTE"
  rclone delete "$BACKUP_REMOTE" --min-age "${KEEP_DAYS}d" --include 'dna-*.dump' --include 'uploads-*.tar.gz'
  echo "off-site copy:    $BACKUP_REMOTE"
fi
