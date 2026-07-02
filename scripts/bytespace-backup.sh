#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${BYTESPACE_BACKUP_CONFIG:-/etc/bytespace/backup.env}"
if [ -f "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
fi

BACKUP_DIR="${BYTESPACE_BACKUP_DIR:-/opt/bytespace-backups}"
APP_DIR="${BYTESPACE_APP_DIR:-/opt/bytespace}"
DB_NAME="${BYTESPACE_DB_NAME:-bytespace}"
UPLOADS_DIR="${BYTESPACE_UPLOADS_DIR:-$APP_DIR/server/uploads}"
RETENTION_DAYS="${BYTESPACE_RETENTION_DAYS:-7}"
S3_ENABLED="${BYTESPACE_S3_ENABLED:-false}"
S3_PREFIX="${BYTESPACE_S3_PREFIX:-bytespace}"

stamp="$(date -u +%Y%m%d-%H%M%S)"
backup_date="$(date -u +%F)"
mkdir -p "$BACKUP_DIR"

db_backup="$BACKUP_DIR/bytespace-db-$stamp.sql"
uploads_backup="$BACKUP_DIR/bytespace-uploads-$stamp.tar.gz"

echo "Creating PostgreSQL backup: $db_backup"
if [ -n "${BYTESPACE_DATABASE_URL:-}" ]; then
  pg_dump "$BYTESPACE_DATABASE_URL" > "$db_backup"
elif [ "$(id -u)" -eq 0 ] && command -v sudo >/dev/null 2>&1; then
  sudo -u postgres pg_dump "$DB_NAME" > "$db_backup"
else
  pg_dump "$DB_NAME" > "$db_backup"
fi

echo "Creating uploads backup: $uploads_backup"
tar -czf "$uploads_backup" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"

if [ "$S3_ENABLED" = "true" ]; then
  if [ -z "${BYTESPACE_BACKUP_BUCKET:-}" ]; then
    echo "BYTESPACE_BACKUP_BUCKET is required when BYTESPACE_S3_ENABLED=true" >&2
    exit 1
  fi
  if ! command -v aws >/dev/null 2>&1; then
    echo "AWS CLI is required when BYTESPACE_S3_ENABLED=true" >&2
    exit 1
  fi

  s3_uri="s3://$BYTESPACE_BACKUP_BUCKET/$S3_PREFIX/$backup_date"
  echo "Uploading backups to $s3_uri/"
  aws s3 cp "$db_backup" "$s3_uri/$(basename "$db_backup")"
  aws s3 cp "$uploads_backup" "$s3_uri/$(basename "$uploads_backup")"
else
  echo "S3 upload disabled. Set BYTESPACE_S3_ENABLED=true in $CONFIG_FILE to enable it."
fi

echo "Removing local backups older than $RETENTION_DAYS days from $BACKUP_DIR"
find "$BACKUP_DIR" -type f \( -name 'bytespace-db-*.sql' -o -name 'bytespace-uploads-*.tar.gz' \) -mtime "+$RETENTION_DAYS" -delete

echo "Backup complete. Local files:"
echo "$db_backup"
echo "$uploads_backup"
