'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  isLightMode: boolean;
  toggleTheme: () => void;
  activeSection: 'dashboard' | 'tasks' | 'pomodoro' | 'habits' | 'notes' | 'settings' | 'music' | 'analyzer' | 'document';
  setActiveSection: (section: 'dashboard' | 'tasks' | 'pomodoro' | 'habits' | 'notes' | 'settings' | 'music' | 'analyzer' | 'document') => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      isLightMode: false,
      toggleTheme: () => set((state) => ({ isLightMode: !state.isLightMode })),
      activeSection: 'dashboard',
      setActiveSection: (section) => set({ activeSection: section }),
    }),
    {
      name: 'ui-store',
    }
  )
);
