#!/usr/bin/env bash
# Nightly Postgres dump, kept for 14 days.
#
# The shop's appointment history is the one thing here that cannot be
# rebuilt from the repo, so it gets backed up on its own schedule rather
# than relying on VPS snapshots.
#
# Install on the server:
#   sudo crontab -e
#   15 3 * * * /opt/barbershop/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/barbershop}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H%M)"

cd "$APP_DIR"
# shellcheck disable=SC1091
set -a; source .env; set +a

mkdir -p backups

docker compose exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "backups/${POSTGRES_DB}_${STAMP}.dump"

gzip -f "backups/${POSTGRES_DB}_${STAMP}.dump"
find backups -name '*.dump.gz' -mtime "+${KEEP_DAYS}" -delete

echo "$(date -Is)  backup ok: ${POSTGRES_DB}_${STAMP}.dump.gz"
