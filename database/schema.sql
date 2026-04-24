PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS raw_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT    NOT NULL,
    raw_line    TEXT    NOT NULL,
    ingested_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS normalized_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_log_id  INTEGER NOT NULL REFERENCES raw_logs(id) ON DELETE CASCADE,
    event_time  TEXT    NOT NULL,
    source      TEXT    NOT NULL,
    event_type  TEXT    NOT NULL,
    user        TEXT    NOT NULL DEFAULT '',
    ip          TEXT    NOT NULL DEFAULT '',
    severity    TEXT    NOT NULL DEFAULT 'Info' CHECK(severity IN ('Critical','Warning','Info')),
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS detection_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    condition   TEXT    NOT NULL,
    threshold   TEXT    NOT NULL DEFAULT '> 1',
    window      TEXT    NOT NULL DEFAULT '5m',
    severity    TEXT    NOT NULL DEFAULT 'Warning' CHECK(severity IN ('Critical','Warning')),
    active      INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    mitre_tag   TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id    INTEGER REFERENCES normalized_events(id) ON DELETE SET NULL,
    rule_id     INTEGER REFERENCES detection_rules(id) ON DELETE SET NULL,
    timestamp   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now')),
    rule        TEXT    NOT NULL,
    user        TEXT    NOT NULL DEFAULT '',
    sourceIP    TEXT    NOT NULL DEFAULT '',
    severity    TEXT    NOT NULL DEFAULT 'Warning' CHECK(severity IN ('Critical','Warning','Info')),
    status      TEXT    NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Investigating','Resolved')),
    nodeId      TEXT    NOT NULL DEFAULT 'hids-host',
    processId   TEXT    NOT NULL DEFAULT '',
    ttpTag      TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS log_sources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id     TEXT    NOT NULL UNIQUE,
    ip          TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'online',
    lastCheckIn TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    event_count INTEGER NOT NULL DEFAULT 0,
    version     TEXT    NOT NULL DEFAULT 'v1.0.0'
);

CREATE TABLE IF NOT EXISTS diagnostic_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id   TEXT    NOT NULL,
    timestamp   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    level       TEXT    NOT NULL DEFAULT 'INFO' CHECK(level IN ('INFO','SUCCESS','WARN','ERROR','CRITICAL')),
    message     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_timestamp  ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity   ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_rule_ip    ON alerts(rule_id, sourceIP, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_time ON normalized_events(event_time);
