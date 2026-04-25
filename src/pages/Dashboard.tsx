import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion } from 'motion/react';
import { fetchStats, fetchAlerts, StatsResponse, AlertsResponse } from '../api/client';
import { Alert } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats,  setStats]  = useState<StatsResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const load = () =>
      Promise.all([fetchStats(), fetchAlerts({ limit: 10 })])
        .then(([s, a]) => { setStats(s); setAlerts(a.data); })
        .catch(console.error);
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const chartData = stats?.chart_data ?? [];
  const total     = stats?.total_alerts   ?? 0;
  const critical  = stats?.critical_count ?? 0;
  const warning   = stats?.warning_count  ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6"
    >
      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-brand-surface rounded-lg p-6 shadow-surface border border-[#E2E8F0] flex flex-col gap-2">
          <h3 className="text-brand-muted text-sm font-semibold uppercase tracking-wider font-sans">Total Alerts</h3>
          <p className="text-primary text-3xl font-display font-bold leading-tight">{total.toLocaleString()}</p>
        </div>
        <div className="bg-brand-surface rounded-lg p-6 shadow-surface border border-[#E2E8F0] flex flex-col gap-2 border-l-4 border-l-brand-critical">
          <h3 className="text-brand-muted text-sm font-semibold uppercase tracking-wider font-sans">Critical</h3>
          <p className="text-brand-critical text-3xl font-display font-bold leading-tight">{critical}</p>
        </div>
        <div className="bg-brand-surface rounded-lg p-6 shadow-surface border border-[#E2E8F0] flex flex-col gap-2 border-l-4 border-l-brand-warning">
          <h3 className="text-brand-muted text-sm font-semibold uppercase tracking-wider font-sans">Warning</h3>
          <p className="text-brand-warning text-3xl font-display font-bold leading-tight">{warning}</p>
        </div>
      </section>

      {/* Chart */}
      <section className="bg-brand-surface rounded-lg shadow-surface border border-[#E2E8F0] p-6 h-[380px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-brand-text text-lg font-display font-bold leading-tight">Alert Volume</h2>
            <p className="text-brand-muted text-sm font-sans">Last 24 Hours</p>
          </div>
        </div>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E2E8F0" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F8FAFC" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" axisLine={false} tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} interval={1} />
              <Tooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #E2E8F0' }} />
              <Area type="monotone" dataKey="count" stroke="#CBD5E1" strokeWidth={2}
                fillOpacity={1} fill="url(#colorCount)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent Alerts Table */}
      <section className="bg-brand-surface rounded-lg shadow-surface border border-[#E2E8F0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1F5F9] flex justify-between items-center">
          <h2 className="text-brand-text text-lg font-display font-bold">Recent Alerts</h2>
          <button className="text-sm font-display font-semibold text-primary hover:text-brand-primary transition-colors">View All →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap text-sm">
            <thead className="bg-[#F8FAFC] text-brand-muted font-sans text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3 font-semibold hidden md:table-cell">Timestamp</th>
                <th className="px-6 py-3 font-semibold">Rule</th>
                <th className="px-6 py-3 font-semibold hidden lg:table-cell">User</th>
                <th className="px-6 py-3 font-semibold hidden sm:table-cell">Source IP</th>
                <th className="px-6 py-3 font-semibold">Severity</th>
                <th className="px-6 py-3 font-semibold hidden md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {alerts.map((alert) => (
                <tr key={alert.id} onClick={() => navigate(`/alert/${alert.id}`)}
                  className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group">
                  <td className="px-6 py-4 text-brand-muted font-mono text-[13px] hidden md:table-cell">{alert.timestamp}</td>
                  <td className="px-6 py-4 font-semibold text-brand-text">{alert.rule}</td>
                  <td className="px-6 py-4 text-brand-muted hidden lg:table-cell">{alert.user}</td>
                  <td className="px-6 py-4 text-brand-muted font-mono text-[13px] hidden sm:table-cell">{alert.sourceIP}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded font-semibold text-xs border ${
                      alert.severity === 'Critical'
                        ? 'bg-[#FFF1F2] text-brand-critical border-[#FFE4E6]'
                        : 'bg-[#FFFBEB] text-brand-warning border-[#FEF3C7]'
                    }`}>
                      <span className={`size-1.5 rounded-full mr-1.5 ${
                        alert.severity === 'Critical' ? 'bg-brand-critical' : 'bg-brand-warning'
                      }`}></span>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={alert.status === 'Resolved' ? 'text-brand-success' : 'text-brand-muted'}>
                      {alert.status}
                    </span>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-brand-muted text-sm">
                    No alerts yet. Start the HIDS daemon to begin collecting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}
