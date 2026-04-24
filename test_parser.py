#!/usr/bin/env python3
"""
Run before activating the daemon to verify the parser works on this machine.

Usage:
    python3 test_parser.py

All tests must pass before starting backend/main.py.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
from parser import parse_line


class TestAuthLogParser(unittest.TestCase):

    def _auth(self, line):
        return parse_line('/var/log/auth.log', line)

    # Ubuntu 22.04 traditional syslog format
    def test_failed_password_22(self):
        line = 'Apr 23 14:32:01 myhost sshd[1234]: Failed password for invalid user admin from 192.168.1.50 port 54321 ssh2'
        r = self._auth(line)
        self.assertIsNotNone(r, 'Should parse Failed password line')
        self.assertEqual(r['event_type'], 'failed_login')
        self.assertEqual(r['ip'], '192.168.1.50')
        self.assertEqual(r['user'], 'admin')

    # Root login failure — should upgrade to root_login_failure
    def test_root_login_failure(self):
        line = 'Apr 23 14:32:05 myhost sshd[1235]: Failed password for root from 10.0.0.9 port 22 ssh2'
        r = self._auth(line)
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'root_login_failure')
        self.assertEqual(r['severity'], 'Critical')

    # Ubuntu 20.04 — space-padded day
    def test_failed_password_20(self):
        line = 'Apr  3 09:01:00 myhost sshd[99]: Failed password for root from 198.51.100.1 port 11111 ssh2'
        r = self._auth(line)
        self.assertIsNotNone(r, 'Should parse Ubuntu 20.04 space-padded day format')
        self.assertEqual(r['ip'], '198.51.100.1')

    # Accepted password
    def test_accepted_password(self):
        line = 'Apr 23 14:33:10 myhost sshd[1236]: Accepted password for ubuntu from 10.0.0.5 port 22 ssh2'
        r = self._auth(line)
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'login_success')

    # Sudo escalation
    def test_sudo_escalation(self):
        line = 'Apr 23 14:40:00 myhost sudo[5678]: alice : TTY=pts/0 ; PWD=/home/alice ; USER=root ; COMMAND=/bin/bash'
        r = self._auth(line)
        self.assertIsNotNone(r)
        self.assertEqual(r['event_type'], 'sudo_escalation')
        self.assertEqual(r['user'], 'alice')

    # Unrelated line should return None
    def test_unrelated_line(self):
        line = 'Apr 23 14:32:01 myhost systemd[1]: Started Daily apt download activities.'
        r = self._auth(line)
        self.assertIsNone(r, 'Unrelated syslog line should return None')

    # Live file access check
    def test_live_auth_log_readable(self):
        try:
            with open('/var/log/auth.log', 'r') as fh:
                fh.read(1)
        except PermissionError:
            self.fail('/var/log/auth.log is not readable. Run setup.sh and re-login.')
        except FileNotFoundError:
            self.skipTest('/var/log/auth.log not found — may not exist on this distro.')


if __name__ == '__main__':
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(unittest.TestLoader().loadTestsFromTestCase(TestAuthLogParser))
    sys.exit(0 if result.wasSuccessful() else 1)
