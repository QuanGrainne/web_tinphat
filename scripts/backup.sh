#!/usr/bin/env bash
# Back up the database and the uploaded pictures.
#
#   data/backups/dna-YYYYmmdd-HHMM.dump   database (pg_dump custom format), one per run, kept KEEP_DAYS days
#   data/backups/uploads/                 mirror of every picture ever uploaded (pictures are never changed
#                                         under the same name, so only new ones are added; deleted ones stay)
#
#   scripts/backup.sh
#
# Environment (all optional):
#   BACKUP_DIR      target directory                             (default: data/backups)
#   KEEP_DAYS       database backups older than this are deleted (default: 14)
#   BACKUP_REMOTE   rclone destination for an off-site copy, e.g. gdrive:tinphat-backups or r2:tinphat-backups.
#                   Needs rclone installed and configured. The dumps go to <remote>/db (pruned after KEEP_DAYS),
#                   the pictures to <remote>/uploads (only new files are uploaded, nothing is deleted there).
#
# Size: one dump is about 0.1 MB, the pictures are stored once, so the backup is about as large as the pictures.
# Run it every night from cron, see "Backup and restore" in docs/deployment-guide.md, which also shows the restore.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/deploy/compose.yml" --env-file "$ROOT/deploy/.env")
OUT_DIR="${BACKUP_DIR:-$ROOT/data/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M)"
DUMP="$OUT_DIR/dna-$STAMP.dump"
MIRROR="$OUT_DIR/uploads"

case "$KEEP_DAYS" in ''|*[!0-9]*) echo "KEEP_DAYS must be a whole number of days" >&2; exit 1 ;; esac

mkdir -p "$OUT_DIR" "$MIRROR"
trap 'rm -f "$DUMP.partial"' EXIT

# 1. database; user and database come from the container's own environment
"${COMPOSE[@]}" exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DUMP.partial"
# custom-format archives start with the PGDMP magic; anything else is an error message
if [ "$(head -c 5 "$DUMP.partial")" != "PGDMP" ]; then
  echo "backup failed: database output is not a pg_dump archive" >&2
  exit 1
fi
mv "$DUMP.partial" "$DUMP"
echo "database backup:  $DUMP ($(wc -c < "$DUMP") bytes)"

# 2. pictures into the mirror; the api container mounts the uploads volume at /app/uploads.
# tar keeps each file's time, so rclone below sees unchanged pictures as already copied.
# Inside sh -c, so no shell (Git Bash included) rewrites the container path.
"${COMPOSE[@]}" exec -T api sh -c 'exec tar -C /app/uploads -cf - .' | tar -C "$MIRROR" -xf -
echo "pictures mirror:  $MIRROR ($(find "$MIRROR" -type f | wc -l) files, $(du -sh "$MIRROR" | cut -f1))"

# 3. drop database backups older than KEEP_DAYS (and archives left by the older version of this script)
find "$OUT_DIR" -maxdepth 1 -type f \( -name 'dna-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -print -delete \
  | sed 's/^/removed old backup: /'

# 4. optional off-site copy; a failure here fails the run, so cron reports it
if [ -n "${BACKUP_REMOTE:-}" ]; then
  if ! command -v rclone > /dev/null; then
    echo "backup failed: BACKUP_REMOTE is set but rclone is not installed" >&2
    exit 1
  fi
  REMOTE="${BACKUP_REMOTE%/}"
  rclone copy "$DUMP" "$REMOTE/db"
  rclone delete "$REMOTE/db" --min-age "${KEEP_DAYS}d" --include 'dna-*.dump'
  # copy, never sync: a picture deleted on the site stays in the backup
  rclone copy "$MIRROR" "$REMOTE/uploads" --stats-one-line --stats 0
  echo "off-site copy:    $REMOTE (db/ and uploads/)"
fi
