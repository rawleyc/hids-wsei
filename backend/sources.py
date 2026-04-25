"""
Source detection — determines which log inputs are available on this host.

Priority:
  1. journald  (systemd) — covers all modern distros, no duplication with rsyslog files
  2. Known log files     — fallback for Alpine, Docker, non-systemd systems
"""

import os
import shutil
import subprocess
import sys

# Tier-2 fallback paths, ordered by distro prevalence
CANDIDATE_FILES = [
    '/var/log/auth.log',    # Debian / Ubuntu / Kali
    '/var/log/syslog',      # Debian / Ubuntu
    '/var/log/secure',      # RHEL / CentOS / Fedora / Rocky / AlmaLinux
    '/var/log/messages',    # RHEL / CentOS / Alpine / openSUSE
    '/var/log/kern.log',    # Some Debian / Ubuntu variants
]


def _journald_readable() -> bool:
    """True if journalctl is present and we have permission to read from it."""
    if not shutil.which('journalctl'):
        return False
    try:
        result = subprocess.run(
            ['journalctl', '-n', '0', '-o', 'json'],
            capture_output=True,
            timeout=5,
        )
        return result.returncode == 0
    except Exception:
        return False


def detect_sources() -> list:
    """
    Returns a list of source dicts to collect from.
    Each dict has keys: 'type' ('journald' | 'file') and 'id' (string label / path).
    """
    if _journald_readable():
        return [{'type': 'journald', 'id': 'journald'}]

    sources = []
    for path in CANDIDATE_FILES:
        try:
            if os.path.exists(path) and os.access(path, os.R_OK):
                sources.append({'type': 'file', 'id': path})
        except OSError:
            pass

    if not sources:
        print(
            '[sources] WARNING: No log sources found. '
            'Neither journald nor any standard log file is readable. '
            'Run setup.sh and re-login.',
            file=sys.stderr,
            flush=True,
        )

    return sources
