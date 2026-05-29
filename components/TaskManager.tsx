'use client';

import { useState } from 'react';
import { useTaskStore } from '@/lib/stores/taskStore';
import { TaskPriority } from '@/lib/types';
import { Trash2, Check, Plus } from 'lucide-react';

export function TaskManager() {
  const { tasks, addTask, deleteTask, toggleTask } = useTaskStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [labels, setLabels] = useState('');

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  // Sort: pending tasks first (newest first), then completed tasks (newest completed first)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === b.status) {
      return b.createdAt - a.createdAt;
    }
    return a.status === 'pending' ? -1 : 1;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      addTask({
        title,
        priority,
        labels: labels.split(',').map((l) => l.trim()).filter(Boolean),
        status: 'pending',
      });
      setTitle('');
      setLabels('');
      setPriority('medium');
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900/50';
      case 'low':
        return 'bg-green-500/10 text-green-600 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/50';
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Add Task Form */}
      <div className="flex flex-col gap-4 p-6 bg-white/80 dark:bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Add New Task</h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
          />
          <div className="grid grid-cols-3 gap-3 items-end">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="px-3 py-3 bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium cursor-pointer"
            >
              <option value="low" className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white">Low Priority</option>
              <option value="medium" className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white">Medium Priority</option>
              <option value="high" className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white">High Priority</option>
            </select>
            <input
              type="text"
              placeholder="Labels (work, study, personal...)"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="px-3 py-3 bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all font-semibold shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 min-h-0 min-w-0"
            >
              <Plus className="w-5 h-5" />
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tasks List */}
      <div className="flex flex-col gap-4 p-6 bg-white/80 dark:bg-slate-800/50 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg">
            Tasks ({pendingTasks.length} pending)
          </h3>
          {completedTasks.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 dark:bg-green-950/40 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-900/50 font-semibold">
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
                    ? 'bg-green-500/5 dark:bg-green-950/10 border-green-100 dark:border-green-900/20 opacity-70 hover:opacity-100'
                    : 'bg-slate-50/50 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer min-h-0 min-w-0 max-h-[20px] max-w-[20px] ${
                    task.status === 'completed'
                      ? 'border-green-500 bg-green-500 dark:bg-green-500 text-white dark:text-slate-900'
                      : 'border-slate-400 dark:border-slate-500 hover:border-green-500 hover:bg-green-500/10 dark:hover:bg-green-400/10 text-transparent'
                  }`}
                  style={{ minHeight: '20px', minWidth: '20px' }}
                >
                  <Check className={`w-3.5 h-3.5 stroke-[3px] transition-transform duration-200 ${task.status === 'completed' ? 'scale-100' : 'scale-0'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium transition-all ${
                    task.status === 'completed' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-white'
                  }`}>{task.title}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors uppercase tracking-wider ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                    {task.labels.map((label) => (
                      <span
                        key={label}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 font-semibold"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex-shrink-0 p-2 hover:bg-red-500/10 dark:hover:bg-red-950/40 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100 opacity-100 min-h-0 min-w-0 cursor-pointer"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

