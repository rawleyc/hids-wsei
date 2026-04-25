import re
import json
from datetime import datetime

# Syslog line prefix — supports traditional (Apr 23 14:32:01) and RFC 5424 ISO timestamps
_SYSLOG_PREFIX = re.compile(
    r'^(?:\d{4}-\d{2}-\d{2}T[\d:.+Z-]+|\w{3}\s+\d{1,2}\s+[\d:]+)'
    r'\s+\S+\s+(?P<process>\S+)\[(?P<pid>\d+)\]:\s+(?P<msg>.+)$'
)

# Message-level patterns (shared by file and journald parsers)
_FAILED   = re.compile(r'Failed \w+ for (?:invalid user )?(?P<user>\S+) from (?P<ip>[\d.]+)')
_ACCEPTED = re.compile(r'Accepted \w+ for (?P<user>\S+) from (?P<ip>[\d.]+)')
_INVALID  = re.compile(r'Invalid user (?P<user>\S+) from (?P<ip>[\d.]+)')
_SUDO     = re.compile(r'(?P<user>\S+)\s+:.*COMMAND=(?P<cmd>.+)')
_USERADD  = re.compile(r'new user: name=(?P<user>\S+)')


def _now_iso() -> str:
    return datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')


# ── Core classifiers (shared by both file and journald paths) ─────────────────

def _classify_auth(process: str, pid: str, msg: str, event_time: str | None = None) -> dict | None:
    """Classify an auth-related message into a normalized event dict."""
    ts = event_time or _now_iso()

    if 'sshd' in process:
        for regex, event_type, severity in [
            (_FAILED,   'failed_login',  'Warning'),
            (_ACCEPTED, 'login_success', 'Info'),
            (_INVALID,  'failed_login',  'Warning'),
        ]:
            fm = regex.search(msg)
            if fm:
                user = fm.group('user') if 'user' in fm.groupdict() else ''
                ip   = fm.group('ip')   if 'ip'   in fm.groupdict() else ''
                if user == 'root' and event_type == 'failed_login':
                    event_type = 'root_login_failure'
                    severity   = 'Critical'
                return {
                    'event_time': ts,
                    'source':     'auth',
                    'event_type': event_type,
                    'user':       user,
                    'ip':         ip,
                    'severity':   severity,
                    'processId':  pid,
                }

    elif 'sudo' in process:
        fm = _SUDO.search(msg)
        if fm:
            return {
                'event_time': ts,
                'source':     'auth',
                'event_type': 'sudo_escalation',
                'user':       fm.group('user'),
                'ip':         '',
                'severity':   'Warning',
                'processId':  pid,
            }

    elif 'useradd' in process or 'userdel' in process:
        fm = _USERADD.search(msg)
        if fm:
            return {
                'event_time': ts,
                'source':     'auth',
                'event_type': 'user_created',
                'user':       fm.group('user'),
                'ip':         '',
                'severity':   'Warning',
                'processId':  pid,
            }

    return None


def _classify_syslog(process: str, pid: str, msg: str, event_time: str | None = None) -> dict | None:
    """Classify a syslog-style message — surfaces security-relevant keywords only."""
    if any(k in msg.lower() for k in ('error', 'fail', 'denied', 'attack', 'invalid')):
        return {
            'event_time': event_time or _now_iso(),
            'source':     'syslog',
            'event_type': 'syslog_error',
            'user':       '',
            'ip':         '',
            'severity':   'Info',
            'processId':  pid,
        }
    return None


# ── File-based parsers ────────────────────────────────────────────────────────

def parse_auth_log(raw_line: str) -> dict | None:
    m = _SYSLOG_PREFIX.match(raw_line)
    if not m:
        return None
    return _classify_auth(m.group('process'), m.group('pid'), m.group('msg'))


def parse_syslog(raw_line: str) -> dict | None:
    m = _SYSLOG_PREFIX.match(raw_line)
    if not m:
        return None
    return _classify_syslog(m.group('process'), m.group('pid'), m.group('msg'))


# ── journald parser ───────────────────────────────────────────────────────────

# Processes that belong to the auth domain
_AUTH_PROCS = frozenset({'sshd', 'sudo', 'su', 'useradd', 'userdel', 'groupadd', 'groupdel', 'login'})


def parse_journald_entry(json_str: str) -> dict | None:
    """
    Parse a structured journald JSON entry (from journalctl -o json).

    journald gives us pre-split fields (SYSLOG_IDENTIFIER, _PID, MESSAGE)
    so we feed them directly into the shared classifiers — no regex prefix needed.
    """
    try:
        entry = json.loads(json_str)
    except (json.JSONDecodeError, ValueError):
        return None

    # MESSAGE may be binary-encoded as a list of ints
    message = entry.get('MESSAGE', '')
    if isinstance(message, list):
        message = ''.join(chr(b) for b in message if isinstance(b, int) and 0 <= b < 128)
    message = str(message).strip()
    if not message:
        return None

    comm = (entry.get('SYSLOG_IDENTIFIER') or entry.get('_COMM', '')).strip()
    pid  = str(entry.get('_PID', '0'))

    # Use the actual event timestamp from journald (microseconds since epoch)
    # Fall back to current time if field is missing or malformed
    try:
        ts_us      = int(entry['__REALTIME_TIMESTAMP'])
        event_time = datetime.utcfromtimestamp(ts_us / 1_000_000).strftime('%Y-%m-%d %H:%M:%S')
    except (KeyError, ValueError, TypeError):
        event_time = _now_iso()

    # Route to auth classifier first for known auth processes
    if any(p in comm for p in _AUTH_PROCS):
        result = _classify_auth(comm, pid, message, event_time)
        if result:
            return result

    # Fall through to syslog classifier (catches kernel / systemd / other daemons)
    return _classify_syslog(comm, pid, message, event_time)


# ── Unified entry point ───────────────────────────────────────────────────────

def parse_line(source_file: str, raw_line: str) -> dict | None:
    """
    Route a raw log line to the correct parser based on its source.

      source_file == 'journald'                → parse_journald_entry
      auth.log / secure (RHEL auth log)        → parse_auth_log
      syslog / messages / kern.log             → parse_syslog
    """
    if source_file == 'journald':
        return parse_journald_entry(raw_line)
    if 'auth' in source_file or 'secure' in source_file:
        return parse_auth_log(raw_line)
    if any(k in source_file for k in ('syslog', 'messages', 'kern')):
        return parse_syslog(raw_line)
    return None
