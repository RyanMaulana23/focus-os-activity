'use client';

import { useState } from 'react';
import { useHabitStore } from '@/lib/stores/habitStore';
import { Trash2, Flame, Plus } from 'lucide-react';

export function HabitTracker() {
  const { habits, addHabit, deleteHabit, completeHabit, getStreak, isCompletedToday, getWeekProgress } = useHabitStore();
  const [habitName, setHabitName] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (habitName.trim()) {
      addHabit(habitName, description);
      setHabitName('');
      setDescription('');
    }
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Add Habit Form */}
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700 shadow-lg">
        <h2 className="text-lg font-bold text-white tracking-tight">Add New Habit</h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Habit name (e.g., Morning meditation, Read a book)"
            value={habitName}
            onChange={(e) => setHabitName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
          />
          <div className="flex gap-3 items-end">
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-700/40 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>

      {/* Habits List */}
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700 shadow-lg flex-1 overflow-hidden">
        <h3 className="font-bold text-white text-lg">Your Habits ({habits.length})</h3>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {habits.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">No habits yet. Start building consistency! 💪</p>
          ) : (
            habits.map((habit) => {
              const streak = getStreak(habit.id);
              const completed = isCompletedToday(habit.id);
              const weekProgress = getWeekProgress(habit.id);

              return (
                <div
                  key={habit.id}
                  className="group flex flex-col gap-3 p-4 bg-slate-700/30 rounded-lg border border-slate-700 hover:border-slate-600 transition-all hover:bg-slate-700/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm">{habit.name}</h3>
                      {habit.description && (
                        <p className="text-xs text-slate-400 mt-1">{habit.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="flex-shrink-0 p-2 hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>

                  {/* Progress Dots */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1.5">
                      {dayLabels.map((label, i) => {
                        const dayDate = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
                        const dayCompleted = weekProgress > i;
                        return (
                          <button
                            key={i}
                            onClick={() => completeHabit(habit.id, dayDate.getTime())}
                            className={`w-7 h-7 rounded-lg font-bold text-xs transition-all transform hover:scale-110 ${
                              dayCompleted
                                ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                            title={label}
                          >
                            ●
                          </button>
                        );
                      })}
                    </div>
                    {/* Streak Badge */}
                    <div className="flex items-center gap-1.5 bg-orange-900/30 px-3 py-1 rounded-lg border border-orange-700/50">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold text-orange-300">{streak}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                        style={{ width: `${(weekProgress / 7) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">{weekProgress}/7</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
