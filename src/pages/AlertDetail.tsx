import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Terminal, Copy, Shield, User, AlertCircle as ErrorIcon } from 'lucide-react';
import { ALERTS } from '../constants';
import { motion } from 'motion/react';

export default function AlertDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const alert = ALERTS.find(a => a.id === id) || ALERTS[0];

  const rawJson = JSON.stringify({
    timestamp: "2023-10-24T14:32:01.045Z",
    level: alert.severity.toUpperCase(),
    source: "authd",
    event: alert.rule.toLowerCase().replace(/ /g, "_"),
    user: alert.user,
    ip: alert.sourceIP,
    method: "publickey",
    message: `Failed publickey for ${alert.user} from ${alert.sourceIP} port 52342 ssh2`,
    alert_rule: "multiple_root_auth_failures",
    attempts: 15,
    window: "5m"
  }, null, 2);

  return (
    <div className="bg-background-light min-h-screen flex flex-col antialiased">
      <motion.header 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6"
      >
        <button 
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity font-display font-semibold text-sm mb-6"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">{alert.rule}</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-100 text-rose-700 text-sm font-bold tracking-wide">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              {alert.severity.toUpperCase()}
            </span>
          </div>
        </div>
      </motion.header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left Column: Metadata Sidebar */}
        <motion.aside 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-4/12 flex flex-col gap-6"
        >
          <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6">
            <h2 className="font-display font-bold text-slate-900 text-lg mb-5 border-b border-slate-100 pb-3">Event Context</h2>
            <div className="flex flex-col gap-5">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Node ID</div>
                <div className="text-sm font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-md inline-block border border-slate-100">{alert.nodeId}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Timestamp</div>
                <div className="text-sm font-bold text-slate-900">{alert.timestamp} UTC</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Process ID</div>
                <div className="text-sm font-bold text-slate-900">{alert.processId}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Target User</div>
                <div className="text-sm font-bold text-slate-900 inline-flex items-center gap-2">
                  <User className="text-slate-400 size-4" />
                  {alert.user}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">TTP/Mitre Tag</div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  {alert.ttpTag}
                </div>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Right Column: Raw Logs & Actions */}
        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-8/12 flex flex-col gap-6"
        >
          <div className="bg-background-dark rounded-xl shadow-soft border border-slate-800 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/50">
              <div className="flex items-center gap-2 text-slate-400">
                <Terminal className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-widest">Raw Log Evidence</span>
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(rawJson)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-700"
              >
                <Copy className="size-4" />
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="font-mono text-[13px] leading-relaxed text-slate-300">
                <code>
                  {'{'}<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"timestamp"</span>: <span className="text-emerald-300">"2023-10-24T14:32:01.045Z"</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"level"</span>: <span className="text-rose-400">"{alert.severity.toUpperCase()}"</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"source"</span>: <span className="text-emerald-300">"authd"</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"event"</span>: <span className="text-emerald-300">"authentication_failed"</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"user"</span>: <span className="text-emerald-300">"{alert.user}"</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"ip"</span>: <span className="text-emerald-300">"{alert.sourceIP}"</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"method"</span>: <span className="text-emerald-300">"publickey"</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"message"</span>: <span className="text-emerald-300">"Failed publickey for {alert.user} from {alert.sourceIP} port 52342 ssh2"</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"alert_rule"</span>: <span className="text-emerald-300">"multiple_root_auth_failures"</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"attempts"</span>: <span className="text-amber-300">15</span>,<br />
                  &nbsp;&nbsp;<span className="text-blue-300">"window"</span>: <span className="text-emerald-300">"5m"</span><br />
                  {'}'}
                </code>
              </pre>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button className="bg-primary hover:bg-blue-700 text-white font-display font-semibold py-3 px-8 rounded-lg shadow-soft transition-colors flex items-center gap-2 h-12">
              <Shield className="size-5" />
              Acknowledge Alert
            </button>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
