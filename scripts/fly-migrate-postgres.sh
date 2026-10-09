#!/usr/bin/env bash
# Migrate licensebox-api from Fly Managed Postgres (MPG) to a legacy Fly Postgres app.
# Runs step by step; see MIGRATE_TO_FLY_POSTGRES.md. Requires: flyctl logged in (`fly auth login`).
# Works from Linux/macOS/WSL/Git Bash. pg_dump/psql run inside Fly, not on your machine.
#
# Usage: scripts/fly-migrate-postgres.sh <step>
#   create    Create the legacy Postgres app (single node, smallest VM, 1GB volume)
#   attach    Create database + user in it and add NEW_DATABASE_URL secret to the API
#   copy      Dump MPG -> /data backup on the new PG machine -> restore into the new DB
#   verify    Compare row counts per table between MPG and the new DB
#   backup    Download the dump to ./backups/
#   switch    Point DATABASE_URL at the new DB and redeploy the API
#   destroy   Delete the Managed Postgres cluster (irreversible, asks for confirmation)
#
# Env (override as needed):
#   API_APP=licensebox-api  PG_APP=licensebox-db  REGION=dfw  FLY_ORG=personal
#   PG_IMAGE=flyio/postgres-flex:16 (match the MPG Postgres major version)
#   SRC_URL   MPG connection string (direct, not pgbouncer). Default: read from the API's DATABASE_URL.
#   DST_URL   New DB connection string printed by `attach`.
#   MPG_CLUSTER  MPG cluster id (from `fly mpg list`), only for `destroy`.
set -euo pipefail

API_APP="${API_APP:-licensebox-api}"
PG_APP="${PG_APP:-licensebox-db}"
REGION="${REGION:-dfw}"
FLY_ORG="${FLY_ORG:-personal}"
DB_NAME="${DB_NAME:-licensebox_db}"
# Must match (or be newer than) the MPG major version, since pg_dump runs from this image.
PG_IMAGE="${PG_IMAGE:-flyio/postgres-flex:16}"
DUMP="/data/mpg-backup.dump"
TABLES='users clients password_reset_tokens audit_logs licenses notification_logs _prisma_migrations'

die() { echo "error: $*" >&2; exit 1; }

# Run a shell script on the new Postgres machine. Base64 avoids quoting issues through `fly ssh`.
remote() {
  local b64
  b64=$(printf '%s' "$1" | base64 | tr -d '\n')
  fly ssh console -a "$PG_APP" -C "sh -c 'echo $b64 | base64 -d | sh'"
}

src_url() {
  if [ -n "${SRC_URL:-}" ]; then echo "$SRC_URL"; return; fi
  # Wake a stopped API machine so we can ssh into it.
  curl -fsS -o /dev/null "https://$API_APP.fly.dev/health" || true
  fly ssh console -a "$API_APP" -C "printenv DATABASE_URL" | tr -d '\r' | tail -n1
}

counts_sql() {
  local sql="" t
  for t in $TABLES; do
    sql="${sql}SELECT '$t' AS t, count(*) FROM public.$t UNION ALL "
  done
  echo "${sql% UNION ALL } ORDER BY 1;"
}

case "${1:-}" in
  create)
    fly postgres create --name "$PG_APP" --org "$FLY_ORG" --region "$REGION" \
      --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1 \
      --image-ref "$PG_IMAGE"
    echo ">> Save the credentials printed above somewhere safe."
    ;;
  attach)
    # DATABASE_URL already exists (MPG), so attach under a temporary name.
    fly postgres attach "$PG_APP" -a "$API_APP" --database-name "$DB_NAME" \
      --variable-name NEW_DATABASE_URL
    echo ">> Copy the NEW_DATABASE_URL value printed above and export it as DST_URL."
    ;;
  copy)
    [ -n "${DST_URL:-}" ] || die "export DST_URL (from the attach step)"
    SRC=$(src_url)
    [ -n "$SRC" ] || die "could not read the MPG connection string; export SRC_URL"
    remote "set -e
pg_dump --no-owner --no-privileges -Fc -d '$SRC' -f $DUMP
ls -lh $DUMP
pg_restore --no-owner --no-privileges --exit-on-error -d '$DST_URL' $DUMP
echo restore-ok"
    ;;
  verify)
    [ -n "${DST_URL:-}" ] || die "export DST_URL"
    SRC=$(src_url)
    SQL=$(counts_sql)
    remote "set -e
cat > /tmp/counts.sql <<'EOSQL'
$SQL
EOSQL
psql -X -A -t -d '$SRC' -f /tmp/counts.sql > /tmp/src.txt
psql -X -A -t -d '$DST_URL' -f /tmp/counts.sql > /tmp/dst.txt
echo '--- MPG ---'; cat /tmp/src.txt
echo '--- nuevo ---'; cat /tmp/dst.txt
if diff /tmp/src.txt /tmp/dst.txt >/dev/null; then echo VERIFY-OK; else echo VERIFY-MISMATCH; exit 1; fi"
    ;;
  backup)
    mkdir -p backups
    out="backups/mpg-backup-$(date +%Y%m%d-%H%M%S).dump"
    fly ssh sftp get -a "$PG_APP" "$DUMP" "$out"
    ls -lh "$out"
    ;;
  switch)
    [ -n "${DST_URL:-}" ] || die "export DST_URL"
    fly secrets set -a "$API_APP" --stage DATABASE_URL="$DST_URL"
    fly secrets unset -a "$API_APP" --stage NEW_DATABASE_URL
    fly deploy -c fly.api.toml --remote-only
    curl -fsS "https://$API_APP.fly.dev/health" && echo && echo ">> API healthy on the new database."
    ;;
  destroy)
    [ -n "${MPG_CLUSTER:-}" ] || die "export MPG_CLUSTER (see: fly mpg list)"
    [ -n "$(ls backups/*.dump 2>/dev/null)" ] || die "no local dump in ./backups; run the backup step first"
    read -r -p "Delete Managed Postgres cluster $MPG_CLUSTER permanently? Type its id to confirm: " ans
    [ "$ans" = "$MPG_CLUSTER" ] || die "aborted"
    fly mpg destroy "$MPG_CLUSTER"
    ;;
  *)
    sed -n '2,20p' "$0"; exit 1 ;;
esac
