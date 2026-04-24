export interface Alert {
  id: string;
  timestamp: string;
  rule: string;
  user: string;
  sourceIP: string;
  severity: 'Critical' | 'Warning' | 'Info';
  status: 'Open' | 'Investigating' | 'Resolved';
  nodeId: string;
  processId: string;
  ttpTag: string;
}

export interface Rule {
  id: string;
  name: string;
  condition: string;
  threshold: string;
  window: string;
  severity: 'Critical' | 'Warning';
  active: boolean;
}

export interface Agent {
  id: string;
  ip: string;
  status: 'online' | 'offline';
  lastCheckIn: string;
  version: string;
}

export interface LogLine {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' | 'SUCCESS';
  message: string;
}
