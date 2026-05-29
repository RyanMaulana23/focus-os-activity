'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, TaskStatus, TaskPriority } from '@/lib/types';

interface TaskStore {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  getTasks: (filter?: { status?: TaskStatus; priority?: TaskPriority }) => Task[];
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: Date.now().toString(),
          createdAt: Date.now(),
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },
      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }));
      },
      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
      },
      toggleTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: task.status === 'completed' ? 'pending' : 'completed',
                  completedAt: task.status === 'pending' ? Date.now() : undefined,
                }
              : task
          ),
        }));
      },
      getTasks: (filter) => {
        const tasks = get().tasks;
        if (!filter) return tasks;
        return tasks.filter((task) => {
          if (filter.status && task.status !== filter.status) return false;
          if (filter.priority && task.priority !== filter.priority) return false;
          return true;
        });
      },
    }),
    {
      name: 'task-store',
    }
  )
);
