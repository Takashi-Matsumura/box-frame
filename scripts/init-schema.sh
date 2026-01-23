#!/bin/sh
# ========================================
# Database Schema Initialization Script
# Uses psql for direct SQL execution
# べき等性を確保
# ========================================

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL}" ]; then
  echo "  ERROR: DATABASE_URL not set"
  exit 1
fi

# Remove Prisma-specific query parameters (?schema=public) from DATABASE_URL
# psql doesn't understand these parameters
# Use parameter expansion instead of sed for better compatibility
PSQL_URL="${DATABASE_URL%%\?*}"

echo "  Connecting to database..."

# Check if User table exists
TABLE_EXISTS=$(psql "${PSQL_URL}" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User');" 2>&1)

# Check for connection errors
if echo "$TABLE_EXISTS" | grep -qi "error"; then
  echo "  Database connection error: $TABLE_EXISTS"
  exit 1
fi

# Normalize the result
TABLE_EXISTS=$(echo "$TABLE_EXISTS" | tr -d ' \n')

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "  Schema already applied, skipping..."
  exit 0
fi

echo "  Applying schema..."

# Execute schema SQL
if [ -f scripts/schema.sql ]; then
  RESULT=$(psql "${PSQL_URL}" -f scripts/schema.sql 2>&1)
  if [ $? -eq 0 ]; then
    echo "  Schema applied successfully"
  else
    echo "  ERROR applying schema: $RESULT"
    exit 1
  fi
else
  echo "  ERROR: schema.sql not found"
  exit 1
fi
