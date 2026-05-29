'use client';

import { useState, useEffect } from 'react';
import { usePomodoroStore } from '@/lib/stores/pomodoroStore';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { formatTime } from '@/lib/utils/format';

export function PomodoroTimer() {
  const { isRunning, timeLeft, currentSessionDuration, setIsRunning, setTimeLeft, addSession, setCurrentSessionDuration } =
    usePomodoroStore();
  const [sessionFocusTime, setSessionFocusTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
        setSessionFocusTime((prev) => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      // Session completed
      addSession({
        duration: currentSessionDuration,
        completed: true,
        focusTime: sessionFocusTime,
      });
      setIsRunning(false);
      setTimeLeft(currentSessionDuration * 60);
      setSessionFocusTime(0);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, currentSessionDuration, addSession, setIsRunning, setTimeLeft, sessionFocusTime]);

  const handleToggle = () => setIsRunning(!isRunning);
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(currentSessionDuration * 60);
    setSessionFocusTime(0);
  };

  const progress = ((currentSessionDuration * 60 - timeLeft) / (currentSessionDuration * 60)) * 100;

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700 shadow-lg h-full">
      <h2 className="text-2xl font-bold text-white">Pomodoro Timer</h2>
      
      <div className="relative w-56 h-56 rounded-full flex items-center justify-center">
        <svg className="absolute w-full h-full" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="95" fill="none" stroke="#334155" strokeWidth="2" />
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="4"
            strokeDasharray={`${(progress / 100) * 597} 597`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <div className="text-6xl font-mono font-bold text-white">{formatTime(timeLeft)}</div>
          <div className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wider">{currentSessionDuration} min session</div>
        </div>
      </div>

      <div className="flex gap-3 w-full px-4">
        <button
          onClick={handleToggle}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg ${
            isRunning
              ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
          } text-white`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-semibold"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 w-full px-4">
        {[15, 25, 30].map((min) => (
          <button
            key={min}
            onClick={() => {
              setCurrentSessionDuration(min);
              setTimeLeft(min * 60);
              setIsRunning(false);
              setSessionFocusTime(0);
            }}
            className={`flex-1 py-2 rounded-lg transition-all font-semibold text-sm ${
              currentSessionDuration === min
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {min}m
          </button>
        ))}
      </div>
    </div>
  );
}
