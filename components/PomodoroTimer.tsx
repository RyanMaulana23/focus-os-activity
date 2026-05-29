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
    <div className="flex flex-col items-center gap-6 p-6 bg-white dark:bg-slate-800/50 backdrop-blur-md rounded-[24px] border border-slate-200 dark:border-slate-700 shadow-[0_4px_20px_rgba(15,23,42,0.06)] dark:shadow-2xl h-full">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight uppercase tracking-wider">Focus Timer</h2>
      
      {/* Timer Circle - 220px Mobile Optimized */}
      <div className="relative w-[220px] h-[220px] rounded-full flex items-center justify-center">
        <svg className="absolute w-full h-full" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#E2E8F0" strokeWidth="3" className="dark:stroke-slate-700" />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#2563EB"
            strokeWidth="5"
            strokeDasharray={`${(progress / 100) * 565} 565`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <div className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">{formatTime(timeLeft)}</div>
          <div className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 uppercase tracking-wide">{currentSessionDuration} min session</div>
        </div>
      </div>

      {/* Start & Reset Buttons */}
      <div className="flex gap-3 w-full">
        <button
          onClick={handleToggle}
          className={`flex-1 h-[52px] rounded-[14px] font-semibold text-sm transition-all duration-350 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-white ${
            isRunning
              ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600'
              : 'bg-gradient-to-br from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB]'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Start</span>
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="w-[52px] h-[52px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 rounded-[14px] border border-slate-200 dark:border-slate-600/50 transition-all active:scale-[0.96] cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Segmented Duration Control */}
      <div className="flex gap-2 w-full p-1 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
        {[15, 25, 30].map((min) => (
          <button
            key={min}
            onClick={() => {
              setCurrentSessionDuration(min);
              setTimeLeft(min * 60);
              setIsRunning(false);
              setSessionFocusTime(0);
            }}
            className={`flex-1 h-[44px] rounded-lg transition-all font-semibold text-sm cursor-pointer min-h-0 min-w-0 ${
              currentSessionDuration === min
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-850/50'
            }`}
          >
            {min}m
          </button>
        ))}
      </div>
    </div>
  );
}

