'use client';

import { useState } from 'react';
import { useHabitStore } from '@/lib/stores/habitStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { Trash2, Flame, Plus, Check } from 'lucide-react';

export function HabitTracker() {
  const { habits, addHabit, deleteHabit, completeHabit, getStreak, isCompletedToday, getWeekProgress } = useHabitStore();
  const isLightMode = useUIStore((s) => s.isLightMode);
  const [habitName,   setHabitName]   = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (habitName.trim()) {
      addHabit(habitName, description);
      setHabitName('');
      setDescription('');
    }
  };

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // ── Light Mode ────────────────────────────────────────────────────────────
  if (isLightMode) {
    const cardStyle = {
      background: '#FFFFFF',
      border: '1px solid #E4E8F0',
      borderRadius: '16px',
      boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
    };
    const inputStyle = {
      background: '#F8FAFC',
      border: '1px solid #E4E8F0',
      borderRadius: '10px',
      color: '#0F172A',
      fontSize: '14px',
      height: '40px',
      padding: '0 14px',
      width: '100%',
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = '#5B50F0';
      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,80,240,0.12)';
    };
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = '#E4E8F0';
      e.currentTarget.style.boxShadow = 'none';
    };

    return (
      <div className="flex flex-col gap-4 h-full">
        {/* Add Habit Card */}
        <div style={cardStyle} className="p-5">
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }} className="mb-4">
            Add New Habit
          </h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Habit name (e.g., Morning meditation)"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              style={{ ...inputStyle, height: '42px' }}
              className="focus:outline-none transition-all"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, height: '40px', flex: 1 }}
                className="focus:outline-none transition-all"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 font-semibold text-sm active:scale-95 transition-all whitespace-nowrap"
                style={{
                  background: '#5B50F0',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  height: '40px',
                  padding: '0 16px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#4A40E0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#5B50F0')}
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>

        {/* Habits List Card */}
        <div style={cardStyle} className="p-5 flex-1 flex flex-col overflow-hidden">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }} className="mb-4">
            Your Habits{' '}
            <span style={{ color: '#94A3B8', fontWeight: 400 }}>({habits.length})</span>
          </h3>

          <div className="flex flex-col gap-3 overflow-y-auto flex-1">
            {habits.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-4xl mb-2">💪</p>
                <p style={{ fontSize: '13px', color: '#94A3B8' }}>No habits yet. Start building consistency!</p>
              </div>
            ) : (
              habits.map((habit) => {
                const streak = getStreak(habit.id);
                const weekProgress = getWeekProgress(habit.id);

                return (
                  <div
                    key={habit.id}
                    className="group flex flex-col gap-3 p-4 rounded-xl transition-all duration-150"
                    style={{ background: '#F8FAFC', border: '1px solid #E4E8F0' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E4E8F0')}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                          {habit.name}
                        </h4>
                        {habit.description && (
                          <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                            {habit.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="flex-shrink-0 flex items-center justify-center rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        style={{ width: '28px', height: '28px', minWidth: '28px', color: '#94A3B8' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFF1F2'; (e.currentTarget as HTMLButtonElement).style.color = '#E11D48'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Day dots + streak */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        {dayLabels.map((label, i) => {
                          const dayDate = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
                          const dayDone = weekProgress > i;
                          return (
                            <button
                              key={i}
                              onClick={() => completeHabit(habit.id, dayDate.getTime())}
                              className="flex items-center justify-center font-bold text-xs transition-all hover:scale-110 cursor-pointer"
                              style={{
                                width: '26px', height: '26px',
                                borderRadius: '8px',
                                minHeight: 0, minWidth: 0,
                                background: dayDone ? '#5B50F0' : '#EEF0FF',
                                color: dayDone ? '#FFFFFF' : '#94A3B8',
                                border: dayDone ? 'none' : '1px solid #E4E8F0',
                                boxShadow: dayDone ? '0 2px 6px rgba(91,80,240,0.20)' : 'none',
                              }}
                              title={label}
                            >
                              {dayDone ? <Check className="w-3 h-3 stroke-[3]" /> : label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Streak badge */}
                      <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
                        style={{ background: '#FFF7ED', border: '1px solid #FDE68A' }}
                      >
                        <Flame className="w-3.5 h-3.5" style={{ color: '#D97706' }} />
                        <span className="text-xs font-bold" style={{ color: '#D97706' }}>{streak}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 overflow-hidden"
                        style={{ height: '4px', background: '#E4E8F0', borderRadius: '9999px' }}
                      >
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${(weekProgress / 7) * 100}%`,
                            background: '#5B50F0',
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                        {weekProgress}/7
                      </span>
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

  // ── Dark Mode ────────────────────────────────────────────────────────────
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
              const weekProgress = getWeekProgress(habit.id);

              return (
                <div key={habit.id} className="group flex flex-col gap-3 p-4 bg-slate-700/30 rounded-lg border border-slate-700 hover:border-slate-600 transition-all hover:bg-slate-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm">{habit.name}</h3>
                      {habit.description && <p className="text-xs text-slate-400 mt-1">{habit.description}</p>}
                    </div>
                    <button onClick={() => deleteHabit(habit.id)} className="flex-shrink-0 p-2 hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1.5">
                      {dayLabels.map((label, i) => {
                        const dayDate = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
                        const dayCompleted = weekProgress > i;
                        return (
                          <button
                            key={i}
                            onClick={() => completeHabit(habit.id, dayDate.getTime())}
                            className={`w-7 h-7 rounded-lg font-bold text-xs transition-all transform hover:scale-110 ${dayCompleted ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
                            title={label}
                          >
                            {dayCompleted ? '●' : label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1.5 bg-orange-900/30 px-3 py-1 rounded-lg border border-orange-700/50">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold text-orange-300">{streak}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300" style={{ width: `${(weekProgress / 7) * 100}%` }} />
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
