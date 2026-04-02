#!/usr/bin/env bash
set -euo pipefail

MIN_NODE=18

echo "=== Ragaflow Setup ==="

# Check Node.js is installed and meets minimum version
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is not installed. Install v${MIN_NODE}+ from https://nodejs.org"
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt "$MIN_NODE" ]; then
  echo "Error: Node.js v${MIN_NODE}+ required (found $(node -v))"
  exit 1
fi
echo "Node.js $(node -v) ✓"

# Check npm is available
if ! command -v npm &>/dev/null; then
  echo "Error: npm is not installed."
  exit 1
fi
echo "npm $(npm -v) ✓"

# Resolve repo root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$SCRIPT_DIR/web"

# Install web dependencies
echo ""
echo "Installing web dependencies..."
(cd "$WEB_DIR" && npm ci)
echo "Dependencies installed ✓"

# Set up web/.env.local if missing — copy from main repo checkout (for worktrees)
GIT_COMMON="$(cd "$SCRIPT_DIR" && git rev-parse --git-common-dir 2>/dev/null || echo "")"
if [ -n "$GIT_COMMON" ] && [ "$GIT_COMMON" != ".git" ]; then
  REPO_ROOT="$(cd "$GIT_COMMON/.." && pwd)"
else
  REPO_ROOT="$SCRIPT_DIR"
fi
ENV_SOURCE="${REPO_ROOT}/web/.env.local"

if [ ! -f "$WEB_DIR/.env.local" ]; then
  echo ""
  if [ -f "$ENV_SOURCE" ] && [ "$ENV_SOURCE" != "$WEB_DIR/.env.local" ]; then
    cp "$ENV_SOURCE" "$WEB_DIR/.env.local"
    echo "Copied .env.local from main checkout ✓"
  else
    echo "Warning: web/.env.local not found"
    echo "Create web/.env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  fi
else
  echo "web/.env.local already exists ✓"
fi

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Run migrations in supabase/migrations/ via the SQL editor"
echo "  2. Run supabase/seed.sql to insert starter data"
echo "  3. cd web && npm run dev"
