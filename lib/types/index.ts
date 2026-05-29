export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  labels: string[];
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
  dueDate?: number;
}

export interface PomodoroSession {
  id: string;
  duration: number; // in minutes
  date: number;
  completed: boolean;
  focusTime: number; // in seconds
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  completedDates: number[]; // array of dates (timestamps)
}

export interface DailyStats {
  date: number;
  tasksCompleted: number;
  totalFocusTime: number; // in seconds
  pomodoroSessions: number;
}

export interface Music {
  id: string;
  title: string;
  url: string;
  isCustom: boolean;
  uploadedAt?: number;
}

export interface MusicPreset {
  id: string;
  title: string;
  url: string;
  category: 'royalty-free' | 'preset';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: 'task' | 'material' | 'summary';
  uploadedAt: string;
  summary?: string;
  originalNoteId?: string; // untuk referensi note yang di-generate
  fileName?: string; // untuk track file name
  fileType?: 'text' | 'pdf' | 'word'; // tipe file yang diupload
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  audioUrl: string; // Temporary blob URL recreated on mount
  duration: number; // in seconds
  coverImage: string; // Temporary blob URL or gradient placeholder
  uploadedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  coverImage: string; // Temporary blob URL or gradient placeholder
  createdAt: number;
  songs: Song[];
}

