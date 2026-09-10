#!/usr/bin/env bash
# Creates the local PostgreSQL role and database used by backend/.env.
# Needs sudo because it runs as the postgres superuser.
set -euo pipefail

DB_NAME="${DB_NAME:-maat}"
DB_USER="${DB_USER:-maat}"
DB_PASSWORD="${DB_PASSWORD:-maat}"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN CREATEDB PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi

echo "Database '${DB_NAME}' owned by '${DB_USER}' is ready."
echo "DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
