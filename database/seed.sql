INSERT OR IGNORE INTO detection_rules (id, name, condition, threshold, window, severity, active, mitre_tag) VALUES
(1, 'Brute Force SSH',           'event_type == failed_login',      '> 5',  '5m', 'Critical', 1, 'T1110 - Brute Force'),
(2, 'Unauthorized Root Access',  'UID == 0 && Auth == False',        '> 0',  '1m', 'Critical', 1, 'T1078 - Valid Accounts'),
(3, 'Sudo Privilege Escalation', 'event_type == sudo_escalation',    '> 0',  '1m', 'Warning',  1, 'T1548 - Abuse Elevation Control'),
(4, 'New User Account Created',  'event_type == user_created',       '> 0',  '1m', 'Warning',  1, 'T1136 - Create Account');

INSERT OR IGNORE INTO log_sources (node_id, ip, status, version) VALUES
('auth.log',  '127.0.0.1', 'online', 'v1.0.0'),
('syslog',    '127.0.0.1', 'online', 'v1.0.0');
