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
        return 'bg-red-900/40 text-red-300 border-red-700/50 hover:border-red-600';
      case 'medium':
        return 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50 hover:border-yellow-600';
      case 'low':
        return 'bg-green-900/40 text-green-300 border-green-700/50 hover:border-green-600';
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Add Task Form */}
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700 shadow-lg">
        <h2 className="text-lg font-bold text-white tracking-tight">Add New Task</h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
          />
          <div className="grid grid-cols-3 gap-3 items-end">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="px-3 py-3 bg-slate-700/40 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            >
              <option value="low" className="bg-slate-700 text-white">Low Priority</option>
              <option value="medium" className="bg-slate-700 text-white">Medium Priority</option>
              <option value="high" className="bg-slate-700 text-white">High Priority</option>
            </select>
            <input
              type="text"
              placeholder="Labels (work, study, personal...)"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="px-3 py-3 bg-slate-700/40 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all font-semibold shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pending Tasks */}
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700 shadow-lg flex-1 overflow-hidden">
        <h3 className="font-bold text-white text-lg">
          Pending Tasks ({pendingTasks.length})
        </h3>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {pendingTasks.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">No pending tasks. Great start! 🎉</p>
          ) : (
            pendingTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-all border border-slate-700 hover:border-slate-600"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-md border-2 border-slate-500 hover:border-green-400 transition-all flex items-center justify-center hover:bg-green-400/10"
                >
                  {task.status === 'completed' && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{task.title}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                    {task.labels.map((label) => (
                      <span
                        key={label}
                        className="text-xs px-2.5 py-1 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/50 hover:border-blue-600 font-semibold transition-colors"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex-shrink-0 p-2 hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700 shadow-lg max-h-48 overflow-hidden">
          <h3 className="font-bold text-white text-lg">
            Completed ({completedTasks.length})
          </h3>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 p-3 bg-green-900/20 rounded-lg opacity-75 border border-green-800/50 hover:opacity-100 hover:bg-green-900/30 transition-all"
              >
                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="text-slate-400 line-through text-sm flex-1">{task.title}</p>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex-shrink-0 p-1 hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
