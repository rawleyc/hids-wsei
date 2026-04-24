import db as hids_db

# Maps event_type → detection_rule condition field value
EVENT_TYPE_MAP = {
    'failed_login':      'failed_login',
    'root_login_failure':'root_login_failure',
    'sudo_escalation':   'sudo_escalation',
    'user_created':      'user_created',
}

# Window in seconds per rule name (used when rule.window is a string like '5m')
def _parse_window(window_str: str) -> int:
    window_str = window_str.strip().lower()
    if window_str.endswith('m'):
        return int(window_str[:-1]) * 60
    elif window_str.endswith('h'):
        return int(window_str[:-1]) * 3600
    elif window_str.endswith('s'):
        return int(window_str[:-1])
    return 300  # default 5 minutes

def _parse_threshold(threshold_str: str) -> int:
    # threshold is stored as "> 5" or "> 0" — extract the integer
    parts = threshold_str.strip().split()
    return int(parts[-1]) if parts else 1


def run_detection(conn, event_id: int, event: dict) -> list:
    rules = hids_db.get_active_rules(conn)
    alert_ids = []

    for rule in rules:
        condition = rule['condition']
        # Check if this event type matches the rule's condition keyword
        event_type = event.get('event_type', '')
        matched = event_type in condition or event_type.replace('_', ' ') in condition

        if not matched:
            continue

        window_seconds = _parse_window(rule['window'])
        threshold      = _parse_threshold(rule['threshold'])
        ip             = event.get('ip', '')

        # Count matching events within window
        count = hids_db.count_events_in_window(conn, event_type, ip, window_seconds)
        if count < threshold:
            continue

        # Deduplication — skip if same rule+IP alerted recently
        if hids_db.alert_exists_in_window(conn, rule['id'], ip, window_seconds):
            continue

        alert_id = hids_db.insert_alert(conn, {
            'event_id':  event_id,
            'rule_id':   rule['id'],
            'rule':      rule['name'],
            'user':      event.get('user', ''),
            'ip':        ip,
            'severity':  rule['severity'],
            'nodeId':    'hids-host',
            'processId': event.get('processId', ''),
            'ttpTag':    rule['mitre_tag'],
        })
        alert_ids.append(alert_id)

    return alert_ids
