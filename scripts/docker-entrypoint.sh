#!/bin/sh
# ========================================
# BoX2 Docker Entrypoint Script
# 起動時にDB初期化を実行
# ========================================

set -e

echo "========================================="
echo "BoX2 Starting..."
echo "========================================="

# Wait for PostgreSQL to be ready
echo "[1/4] Waiting for PostgreSQL..."
until nc -z postgres 5432 2>/dev/null; do
  echo "  Waiting for PostgreSQL..."
  sleep 2
done
echo "  PostgreSQL is ready!"

# Initialize database schema
echo "[2/4] Initializing database schema..."
sh scripts/init-schema.sh || { echo "  ERROR: Schema initialization failed"; exit 1; }

# Run seed (idempotent)
echo "[3/4] Running database seed..."
node scripts/seed.js || echo "  Warning: Seed script reported an error"

# Configure OpenLdapConfig
echo "[4/4] Configuring OpenLdapConfig..."
node scripts/init-openldap-config.js || echo "  Warning: OpenLdapConfig script reported an error"

echo ""
echo "========================================="
echo "BoX2 Initialization Complete!"
echo "========================================="
echo ""

# Start the application
exec node server.js
