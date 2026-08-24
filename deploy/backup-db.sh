#!/usr/bin/env bash
# Daily MySQL backup for the social-saas database.
# Usage: run manually to test, then schedule via cron, e.g.:
#   0 3 * * * /var/www/social-saas/deploy/backup-db.sh >> /var/log/social-saas-backup.log 2>&1
#
# Reads DB credentials from the Laravel .env so nothing is duplicated here.
# Keeps the last 14 daily backups and deletes older ones automatically.

set -euo pipefail

APP_DIR="/var/www/social-saas/backend"
BACKUP_DIR="/var/backups/social-saas"
KEEP_DAYS=14

ENV_FILE="$APP_DIR/.env"
DB_NAME=$(grep -E '^DB_DATABASE=' "$ENV_FILE" | cut -d '=' -f2-)
DB_USER=$(grep -E '^DB_USERNAME=' "$ENV_FILE" | cut -d '=' -f2-)
DB_PASS=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2-)
DB_HOST=$(grep -E '^DB_HOST=' "$ENV_FILE" | cut -d '=' -f2-)

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/social_saas_${TIMESTAMP}.sql.gz"

mysqldump --single-transaction --quick \
  -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  | gzip > "$OUT_FILE"

echo "Backed up $DB_NAME to $OUT_FILE"

# Also back up the storage/app/public directory (uploaded logos, favicons,
# post media) — the database alone doesn't include these files.
STORAGE_BACKUP="$BACKUP_DIR/storage_${TIMESTAMP}.tar.gz"
tar -czf "$STORAGE_BACKUP" -C "$APP_DIR/storage/app" public
echo "Backed up storage/app/public to $STORAGE_BACKUP"

# Prune anything older than KEEP_DAYS.
find "$BACKUP_DIR" -name "social_saas_*.sql.gz" -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name "storage_*.tar.gz" -mtime "+$KEEP_DAYS" -delete
