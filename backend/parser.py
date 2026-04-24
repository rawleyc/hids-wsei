import re
from datetime import datetime

# Strip log prefix (supports both traditional syslog and RFC 5424 formats)
_SYSLOG_PREFIX = re.compile(
    r'^(?:\d{4}-\d{2}-\d{2}T[\d:.+Z-]+|\w{3}\s+\d{1,2}\s+[\d:]+)'
    r'\s+\S+\s+(?P<process>\S+)\[(?P<pid>\d+)\]:\s+(?P<msg>.+)$'
)

# Auth.log message patterns
_FAILED   = re.compile(r'Failed \w+ for (?:invalid user )?(?P<user>\S+) from (?P<ip>[\d.]+)')
_ACCEPTED = re.compile(r'Accepted \w+ for (?P<user>\S+) from (?P<ip>[\d.]+)')
_INVALID  = re.compile(r'Invalid user (?P<user>\S+) from (?P<ip>[\d.]+)')
_SUDO     = re.compile(r'(?P<user>\S+)\s+:.*COMMAND=(?P<cmd>.+)')
_USERADD  = re.compile(r'new user: name=(?P<user>\S+)')


def _now_iso() -> str:
    return datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')


def parse_auth_log(raw_line: str) -> dict | None:
    m = _SYSLOG_PREFIX.match(raw_line)
    if not m:
        return None

    process = m.group('process')
    pid     = m.group('pid')
    msg     = m.group('msg')

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
                    'event_time': _now_iso(),
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
                'event_time': _now_iso(),
                'source':     'auth',
                'event_type': 'sudo_escalation',
                'user':       fm.group('user'),
                'ip':         '',
                'severity':   'Warning',
                'processId':  pid,
            }

    elif 'useradd' in process:
        fm = _USERADD.search(msg)
        if fm:
            return {
                'event_time': _now_iso(),
                'source':     'auth',
                'event_type': 'user_created',
                'user':       fm.group('user'),
                'ip':         '',
                'severity':   'Warning',
                'processId':  pid,
            }

    return None


def parse_syslog(raw_line: str) -> dict | None:
    m = _SYSLOG_PREFIX.match(raw_line)
    if not m:
        return None
    # Only surface lines that contain security-relevant keywords
    msg = m.group('msg')
    if any(k in msg.lower() for k in ('error', 'fail', 'denied', 'attack', 'invalid')):
        return {
            'event_time': _now_iso(),
            'source':     'syslog',
            'event_type': 'syslog_error',
            'user':       '',
            'ip':         '',
            'severity':   'Info',
            'processId':  m.group('pid'),
        }
    return None


def parse_line(source_file: str, raw_line: str) -> dict | None:
    if 'auth' in source_file:
        return parse_auth_log(raw_line)
    elif 'syslog' in source_file:
        return parse_syslog(raw_line)
    return None
