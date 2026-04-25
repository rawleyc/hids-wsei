#!/usr/bin/env python3
"""
HIDS collector daemon — polls log files every 30 seconds.

Run directly:
    nohup python3 backend/main.py >> /var/log/hids.log 2>&1 &

Run via systemd:
    sudo systemctl start hids
"""

import sys
import time
import signal
import logging
import os

sys.path.insert(0, os.path.dirname(__file__))

import collect
import parser as log_parser
import detection
import db as hids_db
from sources import detect_sources

POLL_INTERVAL = 30

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    stream=sys.stdout,
)
log = logging.getLogger('hids')

_running = True


def _handle_signal(signum, frame):
    global _running
    log.info('Signal %d received — shutting down.', signum)
    _running = False


def run_once():
    sources   = detect_sources()
    new_lines = collect.collect_all()

    if new_lines:
        log.info('Collected %d new log lines.', len(new_lines))

    conn = hids_db.get_connection()

    try:
        alerts_created = 0
        source_counts  = {}

        for source_file, raw_line in new_lines:
            parsed = log_parser.parse_line(source_file, raw_line)
            if parsed is None:
                continue

            raw_log_id = hids_db.insert_raw_log(conn, source_file, raw_line)
            event_id   = hids_db.insert_normalized_event(conn, raw_log_id, parsed)

            parsed['raw_line'] = raw_line
            alert_ids = detection.run_detection(conn, event_id, parsed)
            alerts_created += len(alert_ids)

            node_id = os.path.basename(source_file)
            source_counts[node_id] = source_counts.get(node_id, 0) + 1

        # Heartbeat: update every active source even when quiet (keeps agents online)
        for source in sources:
            node_id = os.path.basename(source['id'])
            count    = source_counts.get(node_id, 0)
            hids_db.update_log_source(conn, node_id, count)
            hids_db.insert_diagnostic_log(
                conn, node_id, 'INFO',
                f'Poll complete — {count} new event(s), {alerts_created} alert(s) created',
            )

        conn.commit()
        if alerts_created:
            log.info('Alerts created: %d', alerts_created)

    except Exception as exc:
        conn.rollback()
        log.exception('Pipeline error: %s', exc)
        try:
            for source in sources:
                hids_db.insert_diagnostic_log(
                    conn, os.path.basename(source['id']), 'ERROR', str(exc)
                )
            conn.commit()
        except Exception:
            pass
    finally:
        conn.close()


def main():
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)
    log.info('HIDS daemon starting (poll interval: %ds).', POLL_INTERVAL)

    sources = detect_sources()
    if sources:
        for s in sources:
            log.info('Log source detected: [%s] %s', s['type'], s['id'])
    else:
        log.warning('No log sources detected — will retry each poll cycle.')

    while _running:
        try:
            run_once()
        except Exception as exc:
            log.exception('run_once() failed: %s', exc)
        time.sleep(POLL_INTERVAL)

    log.info('HIDS daemon stopped.')


if __name__ == '__main__':
    main()
