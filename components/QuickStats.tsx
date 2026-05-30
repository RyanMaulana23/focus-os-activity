'use client';

import { useTaskStore } from '@/lib/stores/taskStore';
import { usePomodoroStore } from '@/lib/stores/pomodoroStore';
import { useHabitStore } from '@/lib/stores/habitStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { formatTime } from '@/lib/utils/format';

export function QuickStats() {
  const tasks  = useTaskStore((state) => state.tasks);
  const { sessions } = usePomodoroStore();
  const habits  = useHabitStore((state) => state.habits);
  const getStreak = useHabitStore((state) => state.getStreak);
  const isLightMode = useUIStore((s) => s.isLightMode);

  const pomodoroStats = (() => {
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(
      (s) => new Date(s.date).toDateString() === today && s.completed
    );
    return {
      sessions: todaySessions.length,
      totalTime: todaySessions.reduce((acc, s) => acc + s.focusTime, 0),
    };
  })();

  const maxStreak = Math.max(...habits.map((h) => getStreak(h.id)), 0);
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = tasks.length;

  // Each card has a unique top-border accent color
  const stats = [
    {
      label: 'Tasks Due',
      value: `${totalTasks - completedTasks}`,
      subLabel: `${completedTasks} completed`,
      emoji: '📋',
      topAccent: '#5B50F0',         // indigo
      iconBg: 'rgba(91,80,240,0.10)',
      iconColor: '#5B50F0',
      darkIconBg: 'rgba(91,80,240,0.15)',
      darkColor:  'from-indigo-600/10 border-indigo-700',
    },
    {
      label: 'Tasks Done',
      value: `${completedTasks}`,
      subLabel: `out of ${totalTasks}`,
      emoji: '✅',
      topAccent: '#059669',         // emerald
      iconBg: 'rgba(5,150,105,0.10)',
      iconColor: '#059669',
      darkIconBg: 'rgba(5,150,105,0.15)',
      darkColor:  'from-emerald-600/10 border-emerald-700',
    },
    {
      label: 'Best Streak',
      value: `${maxStreak}d`,
      subLabel: 'days in a row',
      emoji: '🔥',
      topAccent: '#D97706',         // amber
      iconBg: 'rgba(217,119,6,0.10)',
      iconColor: '#D97706',
      darkIconBg: 'rgba(217,119,6,0.15)',
      darkColor:  'from-orange-600/10 border-orange-700',
    },
    {
      label: 'Sessions',
      value: pomodoroStats.sessions.toString(),
      subLabel: formatTime(pomodoroStats.totalTime) + ' focused',
      emoji: '⚡',
      topAccent: '#7C3AED',         // violet
      iconBg: 'rgba(124,58,237,0.10)',
      iconColor: '#7C3AED',
      darkIconBg: 'rgba(124,58,237,0.15)',
      darkColor:  'from-violet-600/10 border-violet-700',
    },
  ];

  if (isLightMode) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="relative bg-white rounded-2xl overflow-hidden cursor-default group transition-all duration-200 hover:shadow-md"
            style={{
              border: '1px solid #E4E8F0',
              boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
            }}
          >
            {/* Top accent border */}
            <div
              className="absolute top-0 left-0 right-0 h-[4px] rounded-t-2xl"
              style={{ background: stat.topAccent }}
            />

            <div className="p-5 pt-6">
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-4 flex-shrink-0"
                style={{
                  background: stat.iconBg,
                  color: stat.iconColor,
                }}
              >
                {stat.emoji}
              </div>

              {/* Value */}
              <p
                className="font-semibold leading-none mb-1 tabular-nums"
                style={{ fontSize: '28px', color: '#0F172A' }}
              >
                {stat.value}
              </p>

              {/* Label */}
              <p
                className="uppercase tracking-widest font-semibold mt-2"
                style={{ fontSize: '11px', color: '#94A3B8', letterSpacing: '0.08em' }}
              >
                {stat.label}
              </p>

              {/* Sub-label */}
              <p className="mt-0.5" style={{ fontSize: '12px', color: '#94A3B8' }}>
                {stat.subLabel}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Dark mode — original gradient style
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className={`group relative overflow-hidden rounded-xl p-6 bg-gradient-to-br ${stat.darkColor}/10 border transition-all duration-300 hover:shadow-lg cursor-default`}
        >
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-semibold"
                style={{ background: stat.darkIconBg, color: stat.iconColor }}
              >
                {stat.emoji}
              </div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{stat.label}</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-white font-mono">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.subLabel}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
