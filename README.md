<div align="center">

```
██╗  ██╗██╗██████╗ ███████╗
██║  ██║██║██╔══██╗██╔════╝
███████║██║██║  ██║███████╗
██╔══██║██║██║  ██║╚════██║
██║  ██║██║██████╔╝███████║
╚═╝  ╚═╝╚═╝╚═════╝ ╚══════╝
Host-Based Intrusion Detection System
```

**your linux host is being watched. every failed login. every sudo. every new user.**

[![stack](https://img.shields.io/badge/React_19-TypeScript-blue?style=flat-square&logo=react)](https://react.dev)
[![stack](https://img.shields.io/badge/Python_3-daemon-yellow?style=flat-square&logo=python)](https://python.org)
[![stack](https://img.shields.io/badge/Express-REST_API-green?style=flat-square&logo=express)](https://expressjs.com)
[![stack](https://img.shields.io/badge/SQLite-WAL_mode-orange?style=flat-square&logo=sqlite)](https://sqlite.org)
[![stack](https://img.shields.io/badge/Gemini_AI-alert_analysis-purple?style=flat-square&logo=google)](https://ai.google.dev)

</div>

---

## what it does

a daemon watches `/var/log/auth.log` and `/var/log/syslog`. every 30 seconds it reads new lines, normalizes them, and runs them through detection rules. when a threshold is crossed — say, 5 failed SSH logins in 5 minutes — it fires an alert. you see it on the dashboard. you click "explain with AI" and gemini tells you exactly what's happening in plain english.

```
/var/log/auth.log
       │
       ▼
  [ collect ]  ← tracks byte offsets, handles log rotation
       │
  [ parse ]    ← regex classifies failed_login / sudo / root_login_failure / ...
       │
  [ normalize ]← structured event into SQLite
       │
  [ detect ]   ← rules engine, threshold + dedup window
       │
       ▼
    alerts → Express API → React dashboard
```

---

## detects

| event | MITRE ATT&CK | default severity |
|---|---|---|
| SSH brute force (5+ failures in 5 min) | T1110 — Brute Force | `CRITICAL` |
| Root login attempt | T1078 — Valid Accounts | `CRITICAL` |
| Sudo privilege escalation | T1548 — Abuse Elevation Control | `WARNING` |
| New user account created | T1136 — Create Account | `WARNING` |

rules are configurable from the dashboard. add your own, toggle them on/off, adjust thresholds live.

---

## stack

```
src/           React 19 + TypeScript + Tailwind + Recharts
api/           Express 4 + better-sqlite3 + Gemini AI
backend/       Python 3 stdlib only — no pip install required
database/      SQLite (WAL mode, foreign keys, compound indexes)
```

---

## spin it up

```bash
# 1. permissions + db init + api deps (Ubuntu 22.04)
sudo bash setup.sh
# re-login for adm group

# 2. verify your log format is supported
python3 test_parser.py

# 3. start everything
python3 backend/main.py &     # daemon polls every 30s
node api/server.js &          # REST API on :3001
npm run dev                   # dashboard on :5173
```

> production: `sudo cp hids.service /etc/systemd/system/ && sudo systemctl enable --now hids`

---

## prove it works

```bash
# simulate a brute force attack
for i in {1..6}; do ssh thisuserdoesnotexist@localhost; done

# wait one daemon cycle (~30s)
# open the dashboard
# watch a CRITICAL alert appear
```

---

## api

```
GET    /api/stats                     dashboard summary + 24h chart
GET    /api/alerts                    paginated, filterable by severity/status
GET    /api/alerts/:id                single alert with raw log line
PATCH  /api/alerts/:id/acknowledge    open ↔ resolved
GET    /api/rules                     all detection rules
POST   /api/rules                     create rule
PATCH  /api/rules/:id                 update / toggle active
GET    /api/health                    log source status + diagnostics
POST   /api/alerts/:id/analyze        gemini AI explanation
```

---

## env

```bash
# api/.env
PORT=3001
DB_PATH=../hids.db
GEMINI_API_KEY=your_key_here   # optional — fallback text shown if missing
```

---

<div align="center">

*built for WSEI Lublin — Host Intrusion Detection Systems coursework*

</div>
