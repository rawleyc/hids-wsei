#!/usr/bin/env bash
set -euo pipefail

TARGET_USER="${SUDO_USER:-$(whoami)}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[setup] Adding $TARGET_USER to the 'adm' group..."
usermod -aG adm "$TARGET_USER"

echo "[setup] Verifying read access to /var/log/auth.log..."
if sudo -u "$TARGET_USER" test -r /var/log/auth.log; then
    echo "[setup] OK: $TARGET_USER can read /var/log/auth.log"
else
    echo "[ERROR] Permission denied. Re-login or run 'newgrp adm' after this script." >&2
    exit 1
fi

echo "[setup] Initialising SQLite database..."
sqlite3 "$REPO_DIR/hids.db" < "$REPO_DIR/database/schema.sql"
sqlite3 "$REPO_DIR/hids.db" < "$REPO_DIR/database/seed.sql"
echo "[setup] Database ready at $REPO_DIR/hids.db"

echo "[setup] Installing Express API dependencies..."
cd "$REPO_DIR/api" && npm install

echo ""
echo "[setup] Done. Next steps:"
echo "  1. Re-login (or run 'newgrp adm') for group membership to take effect"
echo "  2. Copy api/.env.example to api/.env and set your GEMINI_API_KEY"
echo "  3. Run: python3 test_parser.py   (verify parser against your log format)"
echo "  4. Run: python3 backend/main.py  (start the daemon)"
echo "  5. Run: node api/server.js       (start the API)"
echo "  6. Run: npm run dev              (start the React frontend)"
