import React, { useState } from 'react';
import { Terminal, X, Trash2, CheckCircle2, AlertTriangle, Cpu, Radio, Layers } from 'lucide-react';

export default function TerminalLogs({ isOpen = true, onClose, logs = [], onClear }) {
  const [filter, setFilter] = useState('ALL');

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (filter === 'ALL') return true;
    return log.type === filter;
  });

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'QUEUE': return 'bg-sky-950 text-sky-400 border-sky-800';
      case 'EXIF': return 'bg-indigo-950 text-indigo-400 border-indigo-800';
      case 'SPATIAL': return 'bg-cyan-950 text-cyan-400 border-cyan-800';
      case 'AI_QA': return 'bg-purple-950 text-purple-400 border-purple-800';
      case 'TEAM_MERGE': return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'SUCCESS': return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'ERROR': return 'bg-rose-950 text-rose-400 border-rose-800';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-w-5xl mx-auto px-4 pb-4 transition-all animate-in slide-in-from-bottom duration-300">
      <div className="glass-panel-glow rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/40">
        
        {/* Terminal Header */}
        <div className="bg-slate-950/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="font-mono text-sm font-bold text-slate-200">
                Live WebSocket Stream & Async Worker Logs
              </h3>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              WS Connected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          {['ALL', 'SYSTEM', 'QUEUE', 'EXIF', 'SPATIAL', 'AI_QA', 'TEAM_MERGE', 'SUCCESS', 'ERROR'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                filter === type
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Console Log Lines */}
        <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-2 bg-slate-950/95">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-6 text-slate-500 italic">No log entries matching filter...</div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/80 transition-colors">
                <span className="text-slate-500 shrink-0 text-[11px] font-mono">{log.timestamp}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getBadgeStyle(log.type)}`}>
                  {log.type}
                </span>
                <div className="flex-1 text-slate-200 leading-relaxed break-words">
                  {log.message}
                  {log.details && (
                    <div className="mt-1 text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                      {JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
