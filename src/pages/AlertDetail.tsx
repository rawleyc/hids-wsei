import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Terminal, Copy, Shield, User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchAlert, acknowledgeAlert, analyzeAlert } from '../api/client';
import { Alert } from '../types';

type AlertWithLog = Alert & { rawLog?: string };

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [alert,       setAlert]       = useState<AlertWithLog | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [analyzing,   setAnalyzing]   = useState(false);
  const [acking,      setAcking]      = useState(false);

  useEffect(() => {
    if (id) fetchAlert(id).then(setAlert).catch(console.error);
  }, [id]);

  const handleAcknowledge = async () => {
    if (!alert) return;
    setAcking(true);
    try {
      const res = await acknowledgeAlert(String(alert.id));
      setAlert(prev => prev ? { ...prev, status: res.status as Alert['status'] } : prev);
    } finally {
      setAcking(false);
    }
  };

  const handleAnalyze = async () => {
    if (!alert) return;
    setAnalyzing(true);
    try {
      const res = await analyzeAlert(String(alert.id));
      setExplanation(res.explanation);
    } finally {
      setAnalyzing(false);
    }
  };

  const rawLog = alert?.rawLog ?? `Failed password for ${alert?.user ?? ''} from ${alert?.sourceIP ?? ''} port 52342 ssh2`;

  if (!alert) {
    return (
      <div className="flex items-center justify-center min-h-screen text-brand-muted text-sm">
        Loading alert...
      </div>
    );
  }

  return (
    <div className="bg-background-light min-h-screen flex flex-col antialiased">
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6"
      >
        <button onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity font-display font-semibold text-sm mb-6">
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">{alert.rule}</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-100 text-rose-700 text-sm font-bold tracking-wide">
              {alert.severity.toUpperCase()}
            </span>
          </div>
        </div>
      </motion.header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full lg:w-4/12 flex flex-col gap-6"
        >
          <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6">
            <h2 className="font-display font-bold text-slate-900 text-lg mb-5 border-b border-slate-100 pb-3">Event Context</h2>
            <div className="flex flex-col gap-5">
              {[
                { label: 'Node ID',      value: alert.nodeId },
                { label: 'Timestamp',    value: `${alert.timestamp} UTC` },
                { label: 'Process ID',   value: alert.processId },
                { label: 'Status',       value: alert.status },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</div>
                  <div className="text-sm font-bold text-slate-900">{value}</div>
                </div>
              ))}
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Target User</div>
                <div className="text-sm font-bold text-slate-900 inline-flex items-center gap-2">
                  <User className="text-slate-400 size-4" />{alert.user}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">TTP/MITRE Tag</div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  {alert.ttpTag || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* AI Explanation */}
          <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6">
            <h2 className="font-display font-bold text-slate-900 text-lg mb-3">AI Analysis</h2>
            {explanation ? (
              <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
            ) : (
              <button onClick={handleAnalyze} disabled={analyzing}
                className="w-full text-sm font-semibold text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                {analyzing ? <><Loader2 className="size-4 animate-spin" /> Analyzing...</> : 'Explain with AI'}
              </button>
            )}
          </div>
        </motion.aside>

        {/* Raw Log + Actions */}
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
              <button onClick={() => navigator.clipboard.writeText(rawLog)}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-700">
                <Copy className="size-4" />
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="font-mono text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap">{rawLog}</pre>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleAcknowledge} disabled={acking}
              className="bg-primary hover:bg-blue-700 text-white font-display font-semibold py-3 px-8 rounded-lg shadow-soft transition-colors flex items-center gap-2 h-12 disabled:opacity-50">
              {acking ? <Loader2 className="size-5 animate-spin" /> : <Shield className="size-5" />}
              {alert.status === 'Resolved' ? 'Reopen Alert' : 'Acknowledge Alert'}
            </button>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
