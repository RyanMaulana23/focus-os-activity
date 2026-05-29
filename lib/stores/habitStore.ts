'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Habit } from '@/lib/types';
import { isThisWeek, parseISO, startOfDay } from 'date-fns';

interface HabitStore {
  habits: Habit[];
  addHabit: (name: string, description?: string) => void;
  deleteHabit: (id: string) => void;
  completeHabit: (id: string, date?: number) => void;
  getStreak: (habitId: string) => number;
  isCompletedToday: (habitId: string) => boolean;
  getWeekProgress: (habitId: string) => number;
}

export const useHabitStore = create<HabitStore>()(
  persist(
    (set, get) => ({
      habits: [],
      addHabit: (name, description) => {
        const newHabit: Habit = {
          id: Date.now().toString(),
          name,
          description,
          createdAt: Date.now(),
          completedDates: [],
        };
        set((state) => ({ habits: [...state.habits, newHabit] }));
      },
      deleteHabit: (id) => {
        set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }));
      },
      completeHabit: (id, date = Date.now()) => {
        const targetDate = startOfDay(new Date(date)).getTime();
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id
              ? {
                  ...h,
                  completedDates: h.completedDates.includes(targetDate)
                    ? h.completedDates.filter((d) => d !== targetDate)
                    : [...h.completedDates, targetDate],
                }
              : h
          ),
        }));
      },
      getStreak: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit || habit.completedDates.length === 0) return 0;

        const uniqueDates = new Set(
          habit.completedDates.map((d) => startOfDay(new Date(d)).getTime())
        );

        let streak = 0;
        let checkDate = startOfDay(new Date());

        // If today is not completed, we check starting from yesterday
        if (!uniqueDates.has(checkDate.getTime())) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        while (uniqueDates.has(checkDate.getTime())) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
      },
      isCompletedToday: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return false;
        const today = startOfDay(new Date()).getTime();
        return habit.completedDates.some((d) => startOfDay(new Date(d)).getTime() === today);
      },
      getWeekProgress: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return 0;
        
        // Rolling last 7 days starting from today backwards
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          return startOfDay(new Date(Date.now() - i * 24 * 60 * 60 * 1000)).getTime();
        });

        const completedInLast7 = habit.completedDates.filter((d) =>
          last7Days.includes(startOfDay(new Date(d)).getTime())
        );
        return completedInLast7.length;
      },
    }),
    {
      name: 'habit-store',
    }
  )
);
