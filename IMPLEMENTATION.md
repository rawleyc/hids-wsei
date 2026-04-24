# HIDS MVP Backend — Implementation Plan

**Feasibility: 95/100**

## Context

The frontend React/TypeScript dashboard is fully built with mock data in `constants.ts`. This plan documents the backend architecture that was implemented: a Python log collection + detection pipeline, an Express REST API, and the frontend wiring that connects the dashboard to live data from the Linux host.

---

## Folder Structure

```
hids-wsei/
├── src/                            ← React app
│   ├── api/
│   │   └── client.ts               ← Typed fetch wrappers for all API endpoints
│   ├── pages/                      ← Dashboard, AlertDetail, DetectionRules, SystemHealth
│   ├── types.ts                    ← TypeScript interfaces (Alert, Rule, Agent, LogLine)
│   └── constants.ts                ← Mock data (kept for reference, no longer imported)
│
├── api/                            ← Express REST server (port 3001)
│   ├── package.json                ← better-sqlite3, express, cors, dotenv, @google/genai
│   ├── server.js                   ← Entry point, mounts all routes
│   ├── db.js                       ← better-sqlite3 singleton (WAL mode)
│   ├── .env.example                ← PORT, DB_PATH, GEMINI_API_KEY
│   └── routes/
│       ├── stats.js                ← GET /api/stats
│       ├── alerts.js               ← GET|PATCH /api/alerts
│       ├── rules.js                ← GET|POST|PATCH /api/rules
│       ├── health.js               ← GET /api/health
│       └── analyze.js              ← POST /api/alerts/:id/analyze (Gemini AI)
│
├── backend/                        ← Python pipeline (no third-party deps)
│   ├── main.py                     ← Daemon loop (30s poll, graceful SIGTERM)
│   ├── collect.py                  ← File offset tracking, reads new log lines
│   ├── parser.py                   ← Regex parsers for auth.log + syslog
│   ├── detection.py                ← Rule evaluation + alert deduplication
│   ├── db.py                       ← sqlite3 stdlib helpers
│   └── offsets.json                ← Persisted byte offsets per log file (git-ignored)
│
├── database/
│   ├── schema.sql                  ← All CREATE TABLE statements
│   └── seed.sql                    ← 4 default detection rules
│
├── setup.sh                        ← Permissions setup + DB init + npm install
├── test_parser.py                  ← Parser test suite (run before starting daemon)
├── hids.service                    ← systemd unit file for the Python daemon
├── hids.db                         ← SQLite database (git-ignored)
└── vite.config.ts                  ← Added proxy: /api → localhost:3001
```

---

## Database Schema

Six tables in `database/schema.sql`:

| Table | Purpose |
|---|---|
| `raw_logs` | Every raw log line ingested, one row per line |
| `normalized_events` | Parsed structured representation of each log entry |
| `detection_rules` | Configurable rules that trigger alerts |
| `alerts` | Generated alerts, linked to events and rules |
| `log_sources` | Health status of each monitored log file |
| `diagnostic_logs` | Collector operational log messages per source |

**Initialise (run once on Ubuntu):**
```bash
sqlite3 hids.db < database/schema.sql
sqlite3 hids.db < database/seed.sql
```

---

## Python Backend

### Pipeline flow
```
cron/daemon trigger
  → collect.py  reads new lines from /var/log/auth.log, /var/log/syslog
  → parser.py   extracts structured fields (event_type, user, ip, severity)
  → db.py       persists raw_log + normalized_event
  → detection.py evaluates active rules, writes alerts if threshold met
  → db.py       updates log_sources health record
```

### Key behaviours

**collect.py**
- Tracks byte offset per file in `offsets.json`
- On first run for a file: sets offset to `os.path.getsize(file)` — skips history
- Handles log rotation: if `file_size < stored_offset`, resets to 0
- Gracefully handles `PermissionError` and `FileNotFoundError` — logs warning, continues

**parser.py**
- Supports both traditional syslog timestamp (`Apr 23 14:32:01`) and RFC 5424 ISO format
- Classifies events: `failed_login`, `root_login_failure`, `login_success`, `sudo_escalation`, `user_created`
- Returns `None` for lines that don't match any security-relevant pattern

**detection.py**
- Loads active rules from DB on each run
- Threshold-based: counts matching events within `window` before alerting
- Deduplication: skips alert if same `(rule_id, ip)` already alerted within the window

**main.py**
- `while True: run_once(); sleep(30)` daemon with `SIGTERM`/`SIGINT` handlers
- Exceptions inside `run_once()` are logged but never crash the daemon loop

### Starting the daemon

```bash
# Direct (development)
python3 backend/main.py

# Background
nohup python3 backend/main.py >> /var/log/hids.log 2>&1 &

# systemd (production)
sudo cp hids.service /etc/systemd/system/
# Edit hids.service: set User= and WorkingDirectory= to match your paths
sudo systemctl daemon-reload
sudo systemctl enable hids
sudo systemctl start hids
```

---

## Express REST API

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/stats` | Summary counts + 24h chart data for Dashboard |
| GET | `/api/alerts` | Paginated alert list (`?severity=`, `?status=`, `?page=`, `?limit=`) |
| GET | `/api/alerts/:id` | Single alert with raw log line |
| PATCH | `/api/alerts/:id/acknowledge` | Toggle alert status Open ↔ Resolved |
| GET | `/api/rules` | All detection rules |
| POST | `/api/rules` | Create new rule |
| PATCH | `/api/rules/:id` | Update rule fields (including toggling active) |
| GET | `/api/health` | Log source status + diagnostic logs per agent |
| POST | `/api/alerts/:id/analyze` | Gemini AI plain-language explanation of alert |

### Starting the API

```bash
cd api
cp .env.example .env
# Edit .env: set GEMINI_API_KEY
npm install
node server.js          # production
node --watch server.js  # development (auto-restart)
```

### Gemini AI fallback
If `GEMINI_API_KEY` is missing or the API call fails, the `/analyze` route returns a placeholder string instead of an error. The frontend never crashes from a failed AI call.

### better-sqlite3 install note
Pin version `9.4.3` — ships pre-built N-API binaries for Node 18 on Ubuntu x64, no `node-gyp` or build tools needed. Verify with:
```bash
node -e "require('better-sqlite3'); console.log('ok')"
```

---

## Frontend Wiring

### `src/api/client.ts`
Single typed fetch module. All pages import from here instead of `constants.ts`.

| Function | Endpoint |
|---|---|
| `fetchStats()` | GET /api/stats |
| `fetchAlerts(params?)` | GET /api/alerts |
| `fetchAlert(id)` | GET /api/alerts/:id |
| `acknowledgeAlert(id)` | PATCH /api/alerts/:id/acknowledge |
| `analyzeAlert(id)` | POST /api/alerts/:id/analyze |
| `fetchRules()` | GET /api/rules |
| `createRule(body)` | POST /api/rules |
| `updateRule(id, body)` | PATCH /api/rules/:id |
| `fetchHealth()` | GET /api/health |

### Vite proxy (`vite.config.ts`)
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
},
```
All `/api/*` requests from the React dev server are forwarded to Express. In production, serve the Vite build statically from Express itself.

---

## Setup & Verification

### First-time setup (Ubuntu 22.04)
```bash
sudo bash setup.sh          # adds user to adm group, inits DB, installs API deps
# Re-login for group membership to take effect
python3 test_parser.py      # all tests must pass before starting daemon
```

### Start all services
```bash
python3 backend/main.py &   # Python daemon (or use systemd)
node api/server.js &        # Express API on :3001
npm run dev                 # React frontend on :3000
```

### Verify each layer with curl
```bash
curl http://localhost:3001/api/stats
curl http://localhost:3001/api/alerts
curl http://localhost:3001/api/rules
curl http://localhost:3001/api/health
```

### End-to-end test (SSH brute-force simulation)
```bash
for i in {1..6}; do ssh nonexistentuser@localhost; done
# Wait up to 30s for daemon poll cycle
# Dashboard should show a CRITICAL alert: "Brute Force SSH"
```

---

## Risk Register (resolved)

| Risk | Resolution |
|---|---|
| `/var/log/auth.log` not readable | `setup.sh` adds user to `adm` group; `collect.py` catches `PermissionError` gracefully |
| `better-sqlite3` native build | Pinned to 9.4.3 with pre-built Node 18 binary; async `sqlite3` fallback documented |
| Gemini API version drift | Graceful fallback placeholder on any error; never crashes the route |
| Log format variability | `test_parser.py` covers Ubuntu 20.04, 22.04, and RFC 5424 formats |
| 30s cron resolution | Replaced with daemon `while True: sleep(30)` + systemd unit |
| `offsets.json` loss re-ingests old logs | First-run offset initialised to `os.path.getsize(file)` |
| Duplicate alerts | Deduplication check on `(rule_id, ip)` before every insert |
