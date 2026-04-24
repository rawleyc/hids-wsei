import React from 'react';
import { Search, Plus, Edit2 } from 'lucide-react';
import { RULES } from '../constants';
import { motion } from 'motion/react';

export default function DetectionRules() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-text">Detection Rules</h1>
          <p className="text-sm text-brand-muted mt-1 font-sans">Manage and configure the logic that triggers alerts.</p>
        </div>
      </div>

      <div className="bg-brand-surface rounded-t-lg border border-[#E2E8F0] border-b-0 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-surface">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted size-5" />
          <input 
            className="w-full pl-10 pr-4 py-2 bg-brand-surface border border-[#E2E8F0] rounded-md text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-sans transition-shadow h-10" 
            placeholder="Search rules..." 
            type="text"
          />
        </div>
        <button className="w-full sm:w-auto bg-brand-primary text-brand-surface font-display font-semibold text-sm px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 h-10 shadow-sm">
          <Plus className="size-4" />
          Add Rule
        </button>
      </div>

      <div className="bg-brand-surface border border-[#E2E8F0] rounded-b-lg shadow-surface overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-brand-muted font-sans w-1/4">Rule Name</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-brand-muted font-sans w-1/4">Condition</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-brand-muted font-sans w-24">Threshold</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-brand-muted font-sans w-24">Window</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-brand-muted font-sans w-32">Severity</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-brand-muted font-sans w-24 text-center">Active</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-brand-muted font-sans w-20 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-sans text-sm">
              {RULES.map((rule) => (
                <tr key={rule.id} className="hover:bg-[#F8FAFC] transition-colors group h-16">
                  <td className="px-6 py-3 text-brand-text font-semibold">{rule.name}</td>
                  <td className="px-6 py-3 text-brand-muted font-mono text-[13px]">{rule.condition}</td>
                  <td className="px-6 py-3 text-brand-muted">{rule.threshold}</td>
                  <td className="px-6 py-3 text-brand-muted">{rule.window}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                      rule.severity === 'Critical' 
                        ? 'bg-[#FFF1F2] text-brand-critical' 
                        : 'bg-[#FFFBEB] text-brand-warning'
                    }`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <div className="relative inline-block w-9 h-5 align-middle select-none">
                      <input 
                        defaultChecked={rule.active} 
                        className="peer absolute block w-5 h-5 rounded-full bg-white border-2 border-slate-300 appearance-none cursor-pointer checked:translate-x-4 checked:border-brand-success transition-all" 
                        type="checkbox"
                      />
                      <label className="block overflow-hidden h-5 rounded-full bg-slate-200 cursor-pointer peer-checked:bg-brand-success transition-colors"></label>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-brand-muted hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100">
                      <Edit2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col divide-y divide-[#E2E8F0]">
          {RULES.map((rule) => (
            <div key={rule.id} className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-brand-text font-semibold text-sm mb-1">{rule.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    rule.severity === 'Critical' ? 'bg-[#FFF1F2] text-brand-critical' : 'bg-[#FFFBEB] text-brand-warning'
                  }`}>
                    {rule.severity}
                  </span>
                </div>
                <div className="relative inline-block w-9 h-5 align-middle select-none">
                  <input defaultChecked={rule.active} className="peer absolute block w-5 h-5 rounded-full bg-white border-2 border-slate-300 appearance-none cursor-pointer checked:translate-x-4 checked:border-brand-success transition-all" type="checkbox" />
                  <label className="block overflow-hidden h-5 rounded-full bg-slate-200 cursor-pointer peer-checked:bg-brand-success transition-colors"></label>
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <code className="font-mono text-xs text-brand-muted">{rule.condition}</code>
              </div>
              <div className="flex justify-between items-center text-xs text-brand-muted">
                <div className="flex gap-4">
                  <span>THRE: {rule.threshold}</span>
                  <span>WIN: {rule.window}</span>
                </div>
                <button className="text-primary font-semibold flex items-center gap-1">
                   Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
