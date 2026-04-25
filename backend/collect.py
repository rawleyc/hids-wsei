import os
import json
import sys
import subprocess

from sources import detect_sources

OFFSETS_FILE       = os.path.join(os.path.dirname(__file__), 'offsets.json')
JOURNALD_CURSOR_KEY = '__journald_cursor'


def load_offsets() -> dict:
    try:
        with open(OFFSETS_FILE, 'r') as fh:
            return json.load(fh)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_offsets(offsets: dict) -> None:
    tmp = OFFSETS_FILE + '.tmp'
    with open(tmp, 'w') as fh:
        json.dump(offsets, fh)
    os.replace(tmp, OFFSETS_FILE)


def _collect_file(log_path: str, offsets: dict) -> list:
    """Read new lines from a log file using byte-offset tracking."""
    try:
        file_size = os.path.getsize(log_path)
    except FileNotFoundError:
        print(f'[collect] WARNING: {log_path} not found, skipping.', file=sys.stderr, flush=True)
        return []

    # First-ever run — skip historical content
    if log_path not in offsets:
        offsets[log_path] = file_size
        return []

    offset = offsets[log_path]

    # Handle log rotation (file shrank)
    if file_size < offset:
        offset = 0

    try:
        with open(log_path, 'r', errors='replace') as fh:
            fh.seek(offset)
            new_lines = fh.readlines()
            offsets[log_path] = fh.tell()
    except PermissionError:
        print(
            f'[collect] WARNING: Cannot read {log_path} — permission denied. '
            'Run setup.sh and re-login.',
            file=sys.stderr, flush=True,
        )
        return []

    return [(log_path, line.rstrip('\n')) for line in new_lines if line.strip()]


def _collect_journald(offsets: dict) -> list:
    """Read new journald entries using cursor tracking (raw JSON strings)."""
    cursor = offsets.get(JOURNALD_CURSOR_KEY)

    if cursor:
        cmd = ['journalctl', '-o', 'json', '--no-pager', '-n', '500',
               '--after-cursor', cursor]
    else:
        # First run: seed from recent history so the dashboard has data immediately.
        # --since now always returns 0 lines (journalctl exits before anything logs),
        # so the cursor was never saved and every poll was stuck retrying.
        cmd = ['journalctl', '-o', 'json', '--no-pager', '-n', '200']

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except Exception as e:
        print(f'[collect] WARNING: journalctl failed: {e}', file=sys.stderr, flush=True)
        return []

    lines = [l for l in result.stdout.splitlines() if l.strip()]
    if not lines:
        return []

    # Advance cursor to last received entry
    try:
        last       = json.loads(lines[-1])
        new_cursor = last.get('__CURSOR')
        if new_cursor:
            offsets[JOURNALD_CURSOR_KEY] = new_cursor
    except (json.JSONDecodeError, KeyError):
        pass

    return [('journald', line) for line in lines]


def collect_all() -> list:
    offsets = load_offsets()
    results = []

    for source in detect_sources():
        if source['type'] == 'journald':
            results.extend(_collect_journald(offsets))
        elif source['type'] == 'file':
            results.extend(_collect_file(source['id'], offsets))

    save_offsets(offsets)
    return results
