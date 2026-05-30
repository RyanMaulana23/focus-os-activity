'use client';

import { useState } from 'react';
import { useTaskStore } from '@/lib/stores/taskStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { TaskPriority } from '@/lib/types';
import { Trash2, Check, Plus } from 'lucide-react';

// ── Light Mode Design Tokens ────────────────────────────────────────────────
const LM = {
  card:    { background: '#FFFFFF', border: '1px solid #E4E8F0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' },
  input:   { background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: '10px', color: '#0F172A', fontSize: '14px', height: '40px', padding: '0 14px' },
  addBtn:  { background: '#5B50F0', color: '#FFFFFF', borderRadius: '10px', height: '40px', padding: '0 16px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' },
  heading: { fontSize: '14px', fontWeight: 600, color: '#0F172A' },
  muted:   { fontSize: '12px', color: '#94A3B8' },
};

const lightPriorityStyles: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  high:   { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' },
  medium: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  low:    { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
};

const darkPriorityStyles: Record<TaskPriority, string> = {
  high:   'bg-red-950/40 text-red-400 border-red-900/50',
  medium: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50',
  low:    'bg-green-950/40 text-green-400 border-green-900/50',
};

export function TaskManager() {
  const { tasks, addTask, deleteTask, toggleTask } = useTaskStore();
  const isLightMode = useUIStore((s) => s.isLightMode);
  const [title,    setTitle]    = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [labels,   setLabels]   = useState('');

  const pendingTasks   = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === b.status) return b.createdAt - a.createdAt;
    return a.status === 'pending' ? -1 : 1;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      addTask({ title, priority, labels: labels.split(',').map((l) => l.trim()).filter(Boolean), status: 'pending' });
      setTitle(''); setLabels(''); setPriority('medium');
    }
  };

  // ── Light Mode Render ────────────────────────────────────────────────────
  if (isLightMode) {
    return (
      <div className="flex flex-col gap-4 h-full">
        {/* Add Task Card */}
        <div style={LM.card} className="p-5">
          <h2 style={LM.heading} className="mb-4">Add New Task</h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...LM.input, width: '100%', height: '42px' }}
              className="focus:outline-none w-full transition-all"
              onFocus={(e) => { e.currentTarget.style.borderColor = '#5B50F0'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,80,240,0.12)'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = '#E4E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                style={{ ...LM.input, height: '40px', cursor: 'pointer', fontWeight: 500 }}
                className="focus:outline-none transition-all"
                onFocus={(e) => { e.currentTarget.style.borderColor = '#5B50F0'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,80,240,0.12)'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#E4E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input
                type="text"
                placeholder="Labels (comma separated)"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                style={{ ...LM.input, height: '40px' }}
                className="focus:outline-none transition-all"
                onFocus={(e) => { e.currentTarget.style.borderColor = '#5B50F0'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,80,240,0.12)'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = '#E4E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <button
                type="submit"
                style={LM.addBtn}
                className="w-full justify-center whitespace-nowrap active:scale-95 transition-all"
                onMouseEnter={(e) => (e.currentTarget.style.background = '#4A40E0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#5B50F0')}
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>
          </form>
        </div>

        {/* Tasks List Card */}
        <div style={LM.card} className="p-5 flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 style={LM.heading}>
              Tasks <span style={{ color: '#94A3B8', fontWeight: 400 }}>({pendingTasks.length} pending)</span>
            </h3>
            {completedTasks.length > 0 && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}
              >
                {completedTasks.length} done
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto pr-0.5 flex-1">
            {tasks.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-4xl mb-2">🎯</p>
                <p style={{ fontSize: '13px', color: '#94A3B8' }}>No tasks yet. Add one above!</p>
              </div>
            ) : (
              sortedTasks.map((task) => {
                const ps = lightPriorityStyles[task.priority];
                return (
                  <div
                    key={task.id}
                    className="group flex items-center gap-3 p-3.5 rounded-xl transition-all duration-150"
                    style={{
                      background: task.status === 'completed' ? '#F0FDF4' : '#F8FAFC',
                      border: task.status === 'completed' ? '1px solid #BBF7D0' : '1px solid #E4E8F0',
                      opacity: task.status === 'completed' ? 0.8 : 1,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#CBD5E1'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = task.status === 'completed' ? '#BBF7D0' : '#E4E8F0'; }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
                      style={{
                        width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', maxWidth: '20px', maxHeight: '20px',
                        borderColor: task.status === 'completed' ? '#5B50F0' : '#CBD5E1',
                        background: task.status === 'completed' ? '#5B50F0' : 'transparent',
                        color: '#FFFFFF',
                      }}
                    >
                      <Check className={`w-3 h-3 stroke-[3px] transition-transform duration-200 ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium transition-all text-sm"
                        style={{ color: task.status === 'completed' ? '#94A3B8' : '#0F172A', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}
                      >
                        {task.title}
                      </p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider"
                          style={{ background: ps.bg, color: ps.text, borderColor: ps.border }}
                        >
                          {task.priority}
                        </span>
                        {task.labels.map((label) => (
                          <span
                            key={label}
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="flex-shrink-0 flex items-center justify-center rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px', color: '#94A3B8' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFF1F2'; (e.currentTarget as HTMLButtonElement).style.color = '#E11D48'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Dark Mode Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Add Task Form */}
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-[20px] border border-slate-700 shadow-lg">
        <h2 className="text-lg font-bold text-white tracking-tight">Add New Task</h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-12 px-4 bg-slate-700/40 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full h-12 px-3 bg-slate-700/40 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium cursor-pointer"
            >
              <option value="low" className="bg-slate-800 text-white">Low Priority</option>
              <option value="medium" className="bg-slate-800 text-white">Medium Priority</option>
              <option value="high" className="bg-slate-800 text-white">High Priority</option>
            </select>
            <input
              type="text"
              placeholder="Labels (work, study, personal...)"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="w-full h-12 px-3 bg-slate-700/40 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
            <button
              type="submit"
              className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 min-h-0 min-w-0"
              style={{ minHeight: '48px' }}
            >
              <Plus className="w-5 h-5" />
              <span>Add Task</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tasks List */}
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-[20px] border border-slate-700 shadow-lg flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-white text-lg">Tasks ({pendingTasks.length} pending)</h3>
          {completedTasks.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-950/40 text-green-300 border border-green-900/50 font-semibold">
              {completedTasks.length} completed
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">No tasks yet. Add one above! 🎉</p>
          ) : (
            sortedTasks.map((task) => (
              <div
                key={task.id}
                className={`group flex items-center gap-3 p-4 rounded-lg transition-all border ${
                  task.status === 'completed'
                    ? 'bg-green-950/10 border-green-900/20 opacity-70 hover:opacity-100'
                    : 'bg-slate-700/30 border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`flex-shrink-0 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                    task.status === 'completed'
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-slate-500 hover:border-green-500 hover:bg-green-400/10 text-transparent'
                  }`}
                  style={{ minHeight: '20px', maxHeight: '20px', minWidth: '20px', maxWidth: '20px', height: '20px', width: '20px' }}
                >
                  <Check className={`w-3.5 h-3.5 stroke-[3px] transition-transform duration-200 ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium transition-all ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-white'}`}>{task.title}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors uppercase tracking-wider ${darkPriorityStyles[task.priority]}`}>
                      {task.priority}
                    </span>
                    {task.labels.map((label) => (
                      <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/50 font-semibold">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex-shrink-0 p-2 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                  style={{ minHeight: '36px', maxHeight: '36px', minWidth: '36px', maxWidth: '36px', height: '36px', width: '36px' }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
