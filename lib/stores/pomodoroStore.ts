'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PomodoroSession } from '@/lib/types';

interface PomodoroStore {
  sessions: PomodoroSession[];
  isRunning: boolean;
  timeLeft: number;
  currentSessionDuration: number;
  addSession: (session: Omit<PomodoroSession, 'id' | 'date'>) => void;
  setIsRunning: (running: boolean) => void;
  setTimeLeft: (time: number) => void;
  setCurrentSessionDuration: (duration: number) => void;
  getTodayStats: () => { sessions: number; totalTime: number };
}

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      isRunning: false,
      timeLeft: 25 * 60, // 25 minutes in seconds
      currentSessionDuration: 25,
      addSession: (session) => {
        const newSession: PomodoroSession = {
          ...session,
          id: Date.now().toString(),
          date: Date.now(),
        };
        set((state) => ({ sessions: [...state.sessions, newSession] }));
      },
      setIsRunning: (running) => set({ isRunning: running }),
      setTimeLeft: (time) => set({ timeLeft: time }),
      setCurrentSessionDuration: (duration) => set({ currentSessionDuration: duration }),
      getTodayStats: () => {
        const today = new Date().toDateString();
        const todaySessions = get().sessions.filter(
          (s) => new Date(s.date).toDateString() === today && s.completed
        );
        return {
          sessions: todaySessions.length,
          totalTime: todaySessions.reduce((acc, s) => acc + s.focusTime, 0),
        };
      },
    }),
    {
      name: 'pomodoro-store',
    }
  )
);
