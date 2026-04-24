import os
import json
import sys

WATCHED_FILES = ['/var/log/auth.log', '/var/log/syslog']
OFFSETS_FILE  = os.path.join(os.path.dirname(__file__), 'offsets.json')


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


def collect_all() -> list:
    offsets  = load_offsets()
    results  = []

    for log_path in WATCHED_FILES:
        try:
            file_size = os.path.getsize(log_path)
        except FileNotFoundError:
            print(f'[collect] WARNING: {log_path} not found, skipping.', file=sys.stderr, flush=True)
            continue

        # First-ever run for this file — skip historical content
        if log_path not in offsets:
            offsets[log_path] = file_size
            save_offsets(offsets)
            continue

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
                file=sys.stderr, flush=True
            )
            continue

        for line in new_lines:
            line = line.rstrip('\n')
            if line:
                results.append((log_path, line))

    save_offsets(offsets)
    return results
