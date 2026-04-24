import { Alert, Rule, Agent, LogLine } from './types';

export const ALERTS: Alert[] = [
  {
    id: '1',
    timestamp: '2023-10-27 14:32:01',
    rule: 'Unauthorized Root Access Attempt',
    user: 'root',
    sourceIP: '192.168.1.105',
    severity: 'Critical',
    status: 'Open',
    nodeId: 'prd-web-04',
    processId: '9042',
    ttpTag: 'T1078 - Valid Accounts'
  },
  {
    id: '2',
    timestamp: '2023-10-27 14:15:22',
    rule: 'Multiple Failed SSH Logins',
    user: 'admin',
    sourceIP: '45.22.19.102',
    severity: 'Warning',
    status: 'Open',
    nodeId: 'prd-web-04',
    processId: '1120',
    ttpTag: 'T1110 - Brute Force'
  },
  {
    id: '3',
    timestamp: '2023-10-27 13:58:10',
    rule: 'Suspicious Binary Execution',
    user: 'www-data',
    sourceIP: '10.0.0.52',
    severity: 'Warning',
    status: 'Investigating',
    nodeId: 'web-server-01',
    processId: '5432',
    ttpTag: 'T1204 - User Execution'
  },
  {
    id: '4',
    timestamp: '2023-10-27 12:05:44',
    rule: 'Malware Signature Detected',
    user: 'system',
    sourceIP: '172.16.0.8',
    severity: 'Critical',
    status: 'Resolved',
    nodeId: 'worker-node-12',
    processId: '221',
    ttpTag: 'T1204.002 - Malicious File'
  }
];

export const RULES: Rule[] = [
  {
    id: '1',
    name: 'Unauthorized Root Access',
    condition: 'UID == 0 && Auth == False',
    threshold: '> 0',
    window: '1m',
    severity: 'Critical',
    active: true
  },
  {
    id: '2',
    name: 'Multiple Failed Logins',
    condition: 'Auth == False',
    threshold: '> 5',
    window: '5m',
    severity: 'Warning',
    active: true
  },
  {
    id: '3',
    name: 'Suspicious Port Scan',
    condition: 'Distinct Ports > 100',
    threshold: '> 100',
    window: '1m',
    severity: 'Warning',
    active: false
  },
  {
    id: '4',
    name: 'Malware Signature Detected',
    condition: 'Hash in Threat Intel',
    threshold: '> 0',
    window: '1m',
    severity: 'Critical',
    active: true
  }
];

export const AGENTS: Agent[] = [
  { id: 'web-server-01', ip: '192.168.1.45', status: 'online', lastCheckIn: 'Just now', version: 'v2.1.4' },
  { id: 'db-cluster-04', ip: '10.0.4.112', status: 'offline', lastCheckIn: '14 mins ago', version: 'v2.1.3' },
  { id: 'api-gateway-01', ip: '192.168.2.10', status: 'online', lastCheckIn: '2 mins ago', version: 'v2.1.4' },
  { id: 'worker-node-12', ip: '10.0.1.55', status: 'online', lastCheckIn: '45 secs ago', version: 'v2.1.4' },
  { id: 'legacy-auth-sv', ip: '172.16.0.4', status: 'offline', lastCheckIn: '2 hours ago', version: 'v1.9.8' },
  { id: 'metrics-aggregator', ip: '10.0.5.20', status: 'online', lastCheckIn: '1 min ago', version: 'v2.1.4' }
];

export const CHART_DATA = [
  { time: '00:00', count: 109 },
  { time: '02:00', count: 21 },
  { time: '04:00', count: 41 },
  { time: '06:00', count: 93 },
  { time: '08:00', count: 33 },
  { time: '10:00', count: 101 },
  { time: '12:00', count: 61 },
  { time: '14:00', count: 45 },
  { time: '16:00', count: 121 },
  { time: '18:00', count: 149 },
  { time: '20:00', count: 1 },
  { time: '22:00', count: 81 },
  { time: 'Now', count: 129 },
];

export const DIAGNOSTIC_LOGS: LogLine[] = [
  { timestamp: '2023-10-27T14:32:01Z', level: 'INFO', message: 'Agent service starting...' },
  { timestamp: '2023-10-27T14:32:02Z', level: 'INFO', message: 'Loading configuration from /etc/hids/config.yaml' },
  { timestamp: '2023-10-27T14:32:03Z', level: 'SUCCESS', message: 'Connected to master stream endpoint.' },
  { timestamp: '2023-10-27T14:35:10Z', level: 'WARN', message: 'High CPU utilization detected (85%). Delaying non-critical log sync.' },
  { timestamp: '2023-10-27T14:48:22Z', level: 'ERROR', message: 'Connection reset by peer. Attempting reconnect (1/5)...' },
  { timestamp: '2023-10-27T14:49:00Z', level: 'ERROR', message: 'Failed to reach stream endpoint. Timed out.' },
  { timestamp: '2023-10-27T14:55:00Z', level: 'CRITICAL', message: 'Agent entered offline state. Backoff sequence initiated.' },
];
