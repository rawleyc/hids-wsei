import React, { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Download, RotateCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { fetchHealth, restartAgent, HealthResponse } from '../api/client';
import { Agent, LogLine } from '../types';

type AgentWithLogs = Agent & { logs: LogLine[] };

export default function SystemHealth() {
  const [health,        setHealth]        = useState<HealthResponse | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [restarting,    setRestarting]    = useState(false);
  const [restartMsg,    setRestartMsg]    = useState<string | null>(null);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(console.error);
    const interval = setInterval(() => fetchHealth().then(setHealth).catch(console.error), 30_000);
    return () => clearInterval(interval);
  }, []);

  const agents      = health?.agents ?? [];
  const onlineCount = health?.agents_online ?? 0;
  const totalCount  = health?.agents_total  ?? 0;

  const selectedData = agents.find(a => a.id === selectedAgent);

  const handleRestart = async () => {
    if (!selectedAgent || restarting) return;
    setRestarting(true);
    setRestartMsg(null);
    try {
      const res = await restartAgent(selectedAgent);
      setRestartMsg(res.message);
    } catch (e: any) {
      setRestartMsg(e.message ?? 'Restart failed');
    } finally {
      setRestarting(false);
    }
  };

  const handleDownloadLogs = () => {
    if (!selectedData) return;
    const content = selectedData.logs.length > 0
      ? selectedData.logs.map(l => `[${l.timestamp}] ${l.level} ${l.message}`).join('\n')
      : 'No logs available.';
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `hids-logs-${selectedAgent}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-[1200px] mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between gap-3 mb-8">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="text-[#111418] tracking-tight text-[32px] font-display font-bold leading-tight">System Health</p>
          <p className="text-brand-muted text-sm font-normal leading-normal">Monitor operational status of HIDS agents across your infrastructure.</p>
        </div>
      </div>

      {/* Overview */}
      <div className="flex flex-col gap-3 p-6 bg-white rounded-xl border border-gray-100 shadow-sm mb-8">
        <div className="flex gap-6 justify-between items-end">
          <p className="text-brand-text text-base font-bold leading-normal">Agents Online</p>
          <p className="text-brand-text text-sm font-bold leading-normal">
            {onlineCount} <span className="text-gray-400 font-normal">/ {totalCount}</span>
          </p>
        </div>
        <div className="rounded-full bg-gray-100 overflow-hidden h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: totalCount > 0 ? `${(onlineCount / totalCount) * 100}%` : '0%' }}
            className="h-full bg-brand-success"
          />
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <motion.div
            key={agent.id}
            layoutId={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className={clsx(
              'bg-white rounded-xl p-5 border shadow-sm transition-all duration-200 cursor-pointer group hover:shadow-md hover:-translate-y-0.5',
              agent.status === 'online' ? 'border-gray-200 hover:border-primary/30' : 'bg-rose-50/50 border-rose-100 hover:border-rose-300'
            )}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className={clsx('font-bold text-base tracking-tight mb-1', agent.status === 'online' ? 'text-brand-text' : 'text-rose-900')}>
                  {agent.id}
                </h3>
                <p className={clsx('text-xs font-mono', agent.status === 'online' ? 'text-gray-500' : 'text-rose-700/70')}>
                  {agent.ip}
                </p>
              </div>
              <div className="relative flex h-3 w-3 mt-1">
                {agent.status === 'online' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span className={clsx(
                  'relative inline-flex rounded-full h-3 w-3',
                  agent.status === 'online' ? 'bg-brand-success' : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                )}></span>
              </div>
            </div>
            <div className={clsx('grid grid-cols-2 gap-4 border-t pt-4', agent.status === 'online' ? 'border-gray-100' : 'border-rose-100/50')}>
              <div>
                <p className={clsx('text-[10px] uppercase tracking-wider font-bold mb-1', agent.status === 'online' ? 'text-gray-400' : 'text-rose-800/60')}>Last Check-in</p>
                <p className={clsx('text-sm font-medium', agent.status === 'online' ? 'text-brand-text' : 'text-rose-900')}>{agent.lastCheckIn}</p>
              </div>
              <div>
                <p className={clsx('text-[10px] uppercase tracking-wider font-bold mb-1', agent.status === 'online' ? 'text-gray-400' : 'text-rose-800/60')}>Version</p>
                <p className={clsx('text-sm font-medium', agent.status === 'online' ? 'text-brand-text' : 'text-rose-900')}>{agent.version}</p>
              </div>
            </div>
          </motion.div>
        ))}
        {agents.length === 0 && (
          <div className="col-span-3 text-center text-brand-muted text-sm py-10">
            No agents connected yet. Start the HIDS daemon to register log sources.
          </div>
        )}
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {selectedAgent && selectedData && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedAgent(null)}
              className="fixed inset-0 bg-brand-primary/20 backdrop-blur-sm z-40 cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-lg font-display font-bold text-brand-text flex items-center gap-2">
                    <TerminalIcon className="text-primary size-5" />
                    Agent Diagnostics
                  </h2>
                  <p className="text-sm text-brand-muted mt-1 font-mono">Node: {selectedAgent}</p>
                </div>
                <button onClick={() => setSelectedAgent(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-brand-primary text-gray-300 font-mono text-[13px] leading-relaxed">
                <div className="space-y-4">
                  {selectedData.logs.length > 0 ? selectedData.logs.map((log, i) => (
                    <div key={i}>
                      <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                      <span className={clsx(
                        log.level === 'INFO'     && 'text-blue-400',
                        log.level === 'SUCCESS'  && 'text-green-400',
                        log.level === 'WARN'     && 'text-yellow-400',
                        log.level === 'ERROR'    && 'text-rose-400',
                        log.level === 'CRITICAL' && 'text-rose-500 font-bold',
                        'font-semibold'
                      )}>{log.level}</span>{' '}
                      {log.message}
                    </div>
                  )) : (
                    <div className="text-slate-500">No diagnostic logs yet for this agent.</div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-white flex flex-col gap-3">
                {restartMsg && (
                  <p className="text-xs text-center text-brand-muted">{restartMsg}</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleDownloadLogs}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Download className="size-4" />
                    Download Logs
                  </button>
                  <button
                    onClick={handleRestart}
                    disabled={restarting}
                    className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {restarting
                      ? <Loader2 className="size-4 animate-spin" />
                      : <RotateCw className="size-4" />}
                    {restarting ? 'Restarting...' : 'Restart Agent'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
