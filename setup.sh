#!/usr/bin/env bash
set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

step() { echo -e "\n${CYAN}▶${NC} ${BOLD}$*${NC}"; }
ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
warn() { echo -e "  ${YELLOW}!${NC} $*"; }
fail() { echo -e "  ${RED}✗${NC} $*" >&2; exit 1; }

# ── must run as root ──────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    fail "run with sudo: sudo bash setup.sh"
fi

TARGET_USER="${SUDO_USER:-$(whoami)}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BOLD}"
cat << 'EOF'
██╗  ██╗██╗██████╗ ███████╗
██║  ██║██║██╔══██╗██╔════╝
███████║██║██║  ██║███████╗
██╔══██║██║██║  ██║╚════██║
██║  ██║██║██████╔╝███████║
╚═╝  ╚═╝╚═╝╚═════╝ ╚══════╝
EOF
echo -e "${NC}setup — $(lsb_release -ds 2>/dev/null || uname -sr)"
echo ""

# ── 1. apt packages ───────────────────────────────────────────────────────────
step "System packages"

if ! command -v apt-get &>/dev/null; then
    fail "apt not found. This script targets Ubuntu/Debian. Install manually: sqlite3 python3 nodejs (>=18) npm"
fi

# clean any corrupted cached lists before update (common on Kali rolling)
rm -f /var/lib/apt/lists/*.lz4 /var/lib/apt/lists/*.gz 2>/dev/null || true
apt-get update -qq 2>/dev/null || warn "apt update completed with warnings — continuing"
apt-get install -y -qq sqlite3 python3 curl build-essential
ok "sqlite3  python3  curl  build-essential"

# ── 2. Node.js 18+ ───────────────────────────────────────────────────────────
step "Node.js"

NODE_OK=false
if command -v node &>/dev/null; then
    NODE_MAJOR=$(node --version 2>/dev/null | grep -oP '(?<=v)\d+' | head -1 || echo 0)
    if [[ ${NODE_MAJOR:-0} -ge 18 ]]; then
        ok "Node.js $(node --version) already installed"
        NODE_OK=true
    else
        warn "Node.js ${NODE_MAJOR:-unknown} detected — need >=18. Upgrading via NodeSource..."
    fi
fi

if [[ $NODE_OK == false ]]; then
    # NodeSource setup — works on Ubuntu and Kali (Debian-based)
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - 2>/dev/null || \
        fail "NodeSource setup failed. Install Node.js 18+ manually: https://nodejs.org"
    apt-get install -y -qq nodejs
    ok "Node.js $(node --version) installed"
fi

ok "npm $(npm --version)"

# ── 3. adm group (log access) ────────────────────────────────────────────────
step "Log file permissions"

usermod -aG adm "$TARGET_USER"
ok "$TARGET_USER added to 'adm' group"
warn "Re-login (or run 'newgrp adm') for /var/log/auth.log access to take effect"

# ── 4. SQLite database ────────────────────────────────────────────────────────
step "Database"

if [[ -f "$REPO_DIR/hids.db" ]]; then
    warn "hids.db already exists — skipping init (delete it to reinitialise)"
else
    sqlite3 "$REPO_DIR/hids.db" < "$REPO_DIR/database/schema.sql"
    sqlite3 "$REPO_DIR/hids.db" < "$REPO_DIR/database/seed.sql"
    ok "hids.db created with schema + seed rules"
fi

# ── 5. npm dependencies ───────────────────────────────────────────────────────
step "Frontend dependencies (root)"
cd "$REPO_DIR" && npm install --silent
ok "node_modules ready"

step "API dependencies (api/)"
cd "$REPO_DIR/api" && npm install --silent
# sanity-check the native module
node -e "require('better-sqlite3'); process.stdout.write('')" \
    && ok "better-sqlite3 native module loads OK" \
    || fail "better-sqlite3 failed to load — try: cd api && npm rebuild better-sqlite3"

# ── 6. .env ──────────────────────────────────────────────────────────────────
step "Environment files"

if [[ ! -f "$REPO_DIR/api/.env" ]]; then
    cp "$REPO_DIR/api/.env.example" "$REPO_DIR/api/.env"
    ok "api/.env created from .env.example"
    warn "Set GEMINI_API_KEY in api/.env for AI alert analysis (optional)"
else
    ok "api/.env already exists"
fi

# ── 7. systemd unit hint ──────────────────────────────────────────────────────
step "systemd (optional)"

UNIT_DST="/etc/systemd/system/hids.service"
if [[ ! -f "$UNIT_DST" ]]; then
    # patch placeholders with real values before copying
    sed \
        -e "s|YOUR_USERNAME|$TARGET_USER|g" \
        -e "s|/path/to/hids-wsei|$REPO_DIR|g" \
        "$REPO_DIR/hids.service" > "$UNIT_DST"
    systemctl daemon-reload
    ok "hids.service installed — run: sudo systemctl enable --now hids"
else
    ok "hids.service already installed"
fi

# ── done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}All done.${NC}"
echo ""
echo -e "  ${BOLD}1.${NC}  Re-login so adm group takes effect"
echo -e "  ${BOLD}2.${NC}  Edit ${BOLD}api/.env${NC} — add GEMINI_API_KEY if you want AI analysis"
echo -e "  ${BOLD}3.${NC}  Verify parser:  ${CYAN}python3 test_parser.py${NC}"
echo ""
echo -e "  Start everything:"
echo -e "    ${CYAN}python3 backend/main.py${NC}    # detection daemon"
echo -e "    ${CYAN}node api/server.js${NC}         # REST API :3001"
echo -e "    ${CYAN}npm run dev${NC}                # dashboard :5173"
echo ""
echo -e "  Or use systemd:  ${CYAN}sudo systemctl enable --now hids${NC}"
echo ""
