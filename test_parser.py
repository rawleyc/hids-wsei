#!/usr/bin/env python3
"""
Run before activating the daemon to verify the parser works on this machine.

Usage:
    python3 test_parser.py

All tests must pass before starting backend/main.py.
"""

import json
import unittest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from parser import parse_line, parse_journald_entry
from sources import detect_sources


# ── File-based parser tests ───────────────────────────────────────────────────

class TestAuthLogParser(unittest.TestCase):

    def _auth(self, line):
        return parse_line('/var/log/auth.log', line)

    def test_failed_password_ubuntu22(self):
        line = 'Apr 23 14:32:01 myhost sshd[1234]: Failed password for invalid user admin from 192.168.1.50 port 54321 ssh2'
        r = self._auth(line)
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'failed_login')
        self.assertEqual(r['ip'], '192.168.1.50')
        self.assertEqual(r['user'], 'admin')

    def test_root_login_failure(self):
        line = 'Apr 23 14:32:05 myhost sshd[1235]: Failed password for root from 10.0.0.9 port 22 ssh2'
        r = self._auth(line)
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'root_login_failure')
        self.assertEqual(r['severity'], 'Critical')

    def test_failed_password_ubuntu20_space_padded(self):
        line = 'Apr  3 09:01:00 myhost sshd[99]: Failed password for root from 198.51.100.1 port 11111 ssh2'
        r = self._auth(line)
        self.assertIsNotNone(r, 'Should parse Ubuntu 20.04 space-padded day format')
        self.assertEqual(r['ip'], '198.51.100.1')

    def test_accepted_password(self):
        line = 'Apr 23 14:33:10 myhost sshd[1236]: Accepted password for ubuntu from 10.0.0.5 port 22 ssh2'
        r = self._auth(line)
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'login_success')

    def test_sudo_escalation(self):
        line = 'Apr 23 14:40:00 myhost sudo[5678]: alice : TTY=pts/0 ; PWD=/home/alice ; USER=root ; COMMAND=/bin/bash'
        r = self._auth(line)
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'sudo_escalation')
        self.assertEqual(r['user'], 'alice')

    def test_unrelated_line_returns_none(self):
        line = 'Apr 23 14:32:01 myhost systemd[1]: Started Daily apt download activities.'
        self.assertIsNone(self._auth(line))

    def test_rhel_secure_log_routing(self):
        """RHEL /var/log/secure must route through parse_auth_log, not return None."""
        line = 'Apr 23 14:32:01 myhost sshd[1234]: Failed password for root from 10.0.0.1 port 22 ssh2'
        r = parse_line('/var/log/secure', line)
        self.assertIsNotNone(r, '/var/log/secure (RHEL) should parse auth events')
        self.assertEqual(r['event_type'], 'root_login_failure')

    def test_rhel_messages_log_routing(self):
        """RHEL /var/log/messages must route through parse_syslog."""
        line = 'Apr 23 14:32:01 myhost kernel[0]: error in disk driver'
        r = parse_line('/var/log/messages', line)
        self.assertIsNotNone(r, '/var/log/messages should parse syslog errors')
        self.assertEqual(r['event_type'], 'syslog_error')


# ── journald parser tests ─────────────────────────────────────────────────────

class TestJournaldParser(unittest.TestCase):

    def _j(self, comm, pid, message):
        entry = {
            'SYSLOG_IDENTIFIER': comm,
            '_PID': str(pid),
            'MESSAGE': message,
            '__CURSOR': 's=abc;i=1',
        }
        return parse_journald_entry(json.dumps(entry))

    def test_journald_failed_ssh(self):
        r = self._j('sshd', 1234, 'Failed password for invalid user admin from 192.168.1.50 port 54321 ssh2')
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'failed_login')
        self.assertEqual(r['ip'], '192.168.1.50')
        self.assertEqual(r['user'], 'admin')

    def test_journald_root_login_failure(self):
        r = self._j('sshd', 1235, 'Failed password for root from 10.0.0.9 port 22 ssh2')
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'root_login_failure')
        self.assertEqual(r['severity'], 'Critical')

    def test_journald_accepted_ssh(self):
        r = self._j('sshd', 1236, 'Accepted password for ubuntu from 10.0.0.5 port 22 ssh2')
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'login_success')

    def test_journald_sudo(self):
        r = self._j('sudo', 5678, 'alice : TTY=pts/0 ; PWD=/home/alice ; USER=root ; COMMAND=/bin/bash')
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'sudo_escalation')
        self.assertEqual(r['user'], 'alice')

    def test_journald_useradd(self):
        r = self._j('useradd', 999, 'new user: name=mallory,UID=1002,GID=1002')
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'user_created')
        self.assertEqual(r['user'], 'mallory')

    def test_journald_binary_message(self):
        """journald can encode MESSAGE as a list of ints — must decode cleanly."""
        msg = 'Failed password for root from 1.2.3.4 port 22 ssh2'
        entry = {
            'SYSLOG_IDENTIFIER': 'sshd',
            '_PID': '1',
            'MESSAGE': [ord(c) for c in msg],
        }
        r = parse_journald_entry(json.dumps(entry))
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'root_login_failure')

    def test_journald_unrelated_returns_none(self):
        r = self._j('NetworkManager', 777, 'device wlan0 connected to WiFi')
        self.assertIsNone(r)

    def test_journald_invalid_json_returns_none(self):
        self.assertIsNone(parse_journald_entry('not json at all'))

    def test_journald_via_parse_line(self):
        """Ensure parse_line routes 'journald' source correctly."""
        entry = json.dumps({
            'SYSLOG_IDENTIFIER': 'sshd',
            '_PID': '42',
            'MESSAGE': 'Failed password for alice from 5.6.7.8 port 22 ssh2',
        })
        r = parse_line('journald', entry)
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'failed_login')


# ── Source detection smoke test ───────────────────────────────────────────────

class TestSourceDetection(unittest.TestCase):

    def test_detect_sources_returns_list(self):
        sources = detect_sources()
        self.assertIsInstance(sources, list)

    def test_detect_sources_valid_types(self):
        for s in detect_sources():
            self.assertIn(s['type'], ('journald', 'file'))
            self.assertIn('id', s)

    def test_detect_sources_not_empty_or_warns(self):
        """On any real Linux system, at least one source should be available."""
        sources = detect_sources()
        # Not asserting non-empty — CI / Docker may have neither.
        # Just ensure it doesn't raise.


# ── Live access checks ────────────────────────────────────────────────────────

class TestLiveAccess(unittest.TestCase):

    def test_journald_readable_or_skip(self):
        import shutil, subprocess
        if not shutil.which('journalctl'):
            self.skipTest('journalctl not found — skipping live journald check')
        result = subprocess.run(['journalctl', '-n', '0'], capture_output=True, timeout=5)
        if result.returncode != 0:
            self.skipTest('journald not readable — run setup.sh and re-login')

    def test_auth_log_readable_or_skip(self):
        try:
            with open('/var/log/auth.log', 'r') as fh:
                fh.read(1)
        except PermissionError:
            self.fail('/var/log/auth.log not readable. Run setup.sh and re-login.')
        except FileNotFoundError:
            self.skipTest('/var/log/auth.log not present — normal on journald-only distros')

    def test_secure_log_readable_or_skip(self):
        try:
            with open('/var/log/secure', 'r') as fh:
                fh.read(1)
        except PermissionError:
            self.fail('/var/log/secure not readable.')
        except FileNotFoundError:
            self.skipTest('/var/log/secure not present — normal on non-RHEL systems')


if __name__ == '__main__':
    runner = unittest.TextTestRunner(verbosity=2)
    suite  = unittest.TestLoader().loadTestsFromNames([
        '__main__.TestAuthLogParser',
        '__main__.TestJournaldParser',
        '__main__.TestSourceDetection',
        '__main__.TestLiveAccess',
    ])
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
