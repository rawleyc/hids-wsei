import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'hids.db')


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(os.path.abspath(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys=ON')
    return conn


def insert_raw_log(conn: sqlite3.Connection, source_file: str, raw_line: str) -> int:
    cur = conn.execute(
        'INSERT INTO raw_logs (source_file, raw_line) VALUES (?, ?)',
        (source_file, raw_line)
    )
    return cur.lastrowid


def insert_normalized_event(conn: sqlite3.Connection, raw_log_id: int, fields: dict) -> int:
    cur = conn.execute(
        '''INSERT INTO normalized_events
           (raw_log_id, event_time, source, event_type, user, ip, severity)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (
            raw_log_id,
            fields.get('event_time', ''),
            fields.get('source', ''),
            fields.get('event_type', ''),
            fields.get('user', ''),
            fields.get('ip', ''),
            fields.get('severity', 'Info'),
        )
    )
    return cur.lastrowid


def get_active_rules(conn: sqlite3.Connection) -> list:
    return conn.execute(
        'SELECT * FROM detection_rules WHERE active = 1'
    ).fetchall()


def count_events_in_window(conn: sqlite3.Connection, event_type: str, ip: str, window_seconds: int) -> int:
    row = conn.execute(
        '''SELECT COUNT(*) as cnt FROM normalized_events
           WHERE event_type = ?
             AND ip = ?
             AND event_time >= datetime('now', ? || ' seconds')''',
        (event_type, ip, f'-{window_seconds}')
    ).fetchone()
    return row['cnt'] if row else 0


def alert_exists_in_window(conn: sqlite3.Connection, rule_id: int, ip: str, window_seconds: int) -> bool:
    row = conn.execute(
        '''SELECT 1 FROM alerts
           WHERE rule_id = ?
             AND sourceIP = ?
             AND timestamp >= datetime('now', ? || ' seconds')
           LIMIT 1''',
        (rule_id, ip, f'-{window_seconds}')
    ).fetchone()
    return row is not None


def insert_alert(conn: sqlite3.Connection, fields: dict) -> int:
    cur = conn.execute(
        '''INSERT INTO alerts
           (event_id, rule_id, rule, user, sourceIP, severity, status, nodeId, processId, ttpTag)
           VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?)''',
        (
            fields.get('event_id'),
            fields.get('rule_id'),
            fields.get('rule', ''),
            fields.get('user', ''),
            fields.get('ip', ''),
            fields.get('severity', 'Warning'),
            fields.get('nodeId', 'hids-host'),
            fields.get('processId', ''),
            fields.get('ttpTag', ''),
        )
    )
    return cur.lastrowid


def update_log_source(conn: sqlite3.Connection, node_id: str, event_count: int) -> None:
    conn.execute(
        '''INSERT INTO log_sources (node_id, ip, status, lastCheckIn, event_count, version)
           VALUES (?, '127.0.0.1', 'online', strftime('%Y-%m-%dT%H:%M:%SZ','now'), ?, 'v1.0.0')
           ON CONFLICT(node_id) DO UPDATE SET
             status      = 'online',
             lastCheckIn = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
             event_count = event_count + ?''',
        (node_id, event_count, event_count)
    )


def insert_diagnostic_log(conn: sqlite3.Connection, source_id: str, level: str, message: str) -> None:
    conn.execute(
        'INSERT INTO diagnostic_logs (source_id, level, message) VALUES (?, ?, ?)',
        (source_id, level, message)
    )
