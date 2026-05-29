'use client';

import { useTaskStore } from '@/lib/stores/taskStore';
import { usePomodoroStore } from '@/lib/stores/pomodoroStore';
import { useHabitStore } from '@/lib/stores/habitStore';
import { Clock, CheckCircle, Flame, Zap } from 'lucide-react';
import { formatTime } from '@/lib/utils/format';

export function QuickStats() {
  const tasks = useTaskStore((state) => state.tasks);
  const { sessions } = usePomodoroStore();
  const habits = useHabitStore((state) => state.habits);
  const getStreak = useHabitStore((state) => state.getStreak);
  
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

  const stats = [
    {
      icon: Clock,
      label: 'Focus Time',
      value: formatTime(pomodoroStats.totalTime),
      color: 'from-blue-600 to-cyan-600',
      borderColor: 'border-blue-700',
      iconEmoji: '⏱️',
    },
    {
      icon: CheckCircle,
      label: 'Tasks Done',
      value: `${completedTasks}/${totalTasks}`,
      color: 'from-green-600 to-emerald-600',
      borderColor: 'border-green-700',
      iconEmoji: '✅',
    },
    {
      icon: Flame,
      label: 'Best Streak',
      value: `${maxStreak} days`,
      color: 'from-orange-600 to-red-600',
      borderColor: 'border-orange-700',
      iconEmoji: '🔥',
    },
    {
      icon: Zap,
      label: 'Sessions',
      value: pomodoroStats.sessions.toString(),
      color: 'from-violet-600 to-purple-600',
      borderColor: 'border-violet-700',
      iconEmoji: '⚡',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        return (
          <div
            key={i}
            className={`group relative overflow-hidden rounded-xl p-6 bg-gradient-to-br ${stat.color}/10 border ${stat.borderColor} transition-all duration-300 hover:shadow-lg hover:shadow-${stat.color.split(' ')[1]}/20 cursor-default`}
          >
            {/* Gradient background on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color}/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-lg font-semibold`}>
                  {stat.iconEmoji}
                </div>
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{stat.label}</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-white font-mono">{stat.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
