'use client';

import { useState, useEffect } from 'react';
import { usePomodoroStore } from '@/lib/stores/pomodoroStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { formatTime } from '@/lib/utils/format';

export function PomodoroTimer() {
  const {
    isRunning, timeLeft, currentSessionDuration,
    setIsRunning, setTimeLeft, addSession, setCurrentSessionDuration,
  } = usePomodoroStore();
  const isLightMode = useUIStore((s) => s.isLightMode);
  const [sessionFocusTime, setSessionFocusTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
        setSessionFocusTime((prev) => prev + 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      addSession({ duration: currentSessionDuration, completed: true, focusTime: sessionFocusTime });
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
  const circumference = 2 * Math.PI * 90; // r=90

  if (isLightMode) {
    return (
      <div
        className="flex flex-col items-center gap-5 p-6 h-full"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E4E8F0',
          borderRadius: '16px',
          boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
        }}
      >
        {/* Title */}
        <div className="w-full">
          <h2
            className="font-semibold"
            style={{ fontSize: '14px', color: '#0F172A' }}
          >
            Focus Timer
          </h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
            {currentSessionDuration} min session
          </p>
        </div>

        {/* Timer Ring */}
        <div className="relative w-[200px] h-[200px] flex items-center justify-center flex-shrink-0">
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 200 200">
            {/* Track */}
            <circle cx="100" cy="100" r="90" fill="none" stroke="#EEF0FF" strokeWidth="6" />
            {/* Progress */}
            <circle
              cx="100" cy="100" r="90"
              fill="none"
              stroke="#5B50F0"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
          </svg>
          <div className="flex flex-col items-center justify-center z-10">
            <span
              className="font-semibold tabular-nums leading-none"
              style={{ fontSize: '36px', color: '#0F172A' }}
            >
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
              {isRunning ? 'Running…' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Start & Reset */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handleToggle}
            className="flex-1 flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
            style={{
              height: '44px',
              borderRadius: '12px',
              background: isRunning ? '#E11D48' : '#5B50F0',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: isRunning
                ? '0 2px 8px rgba(225,29,72,0.25)'
                : '0 2px 8px rgba(91,80,240,0.25)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = isRunning ? '#BE123C' : '#4A40E0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = isRunning ? '#E11D48' : '#5B50F0';
            }}
          >
            {isRunning ? <><Pause className="w-4 h-4" /><span>Pause</span></> : <><Play className="w-4 h-4" /><span>Start</span></>}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center transition-all active:scale-[0.96] cursor-pointer"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#F1F5F9',
              border: '1px solid #E4E8F0',
              color: '#64748B',
              flexShrink: 0,
            }}
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Duration Pills */}
        <div
          className="flex gap-1.5 w-full p-1"
          style={{
            background: '#F1F5F9',
            borderRadius: '10px',
            border: '1px solid #E4E8F0',
          }}
        >
          {[15, 25, 30].map((min) => (
            <button
              key={min}
              onClick={() => {
                setCurrentSessionDuration(min);
                setTimeLeft(min * 60);
                setIsRunning(false);
                setSessionFocusTime(0);
              }}
              className="flex-1 font-semibold text-sm transition-all duration-200 cursor-pointer"
              style={{
                height: '36px',
                borderRadius: '8px',
                background: currentSessionDuration === min ? '#5B50F0' : 'transparent',
                color: currentSessionDuration === min ? '#FFFFFF' : '#64748B',
                border: 'none',
                minHeight: 0,
                minWidth: 0,
              }}
            >
              {min}m
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Dark mode — original style
  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-md rounded-[24px] border border-slate-700 shadow-xl h-full">
      <h2 className="text-lg font-semibold text-white tracking-tight uppercase tracking-wider">Focus Timer</h2>

      <div className="relative w-[220px] h-[220px] rounded-full flex items-center justify-center">
        <svg className="absolute w-full h-full" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#334155" strokeWidth="3" />
          <circle
            cx="100" cy="100" r="90"
            fill="none" stroke="#2563EB" strokeWidth="5"
            strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <div className="text-[32px] font-bold text-white tracking-tight leading-none">{formatTime(timeLeft)}</div>
          <div className="text-[13px] font-medium text-slate-400 mt-1.5 uppercase tracking-wide">{currentSessionDuration} min session</div>
        </div>
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={handleToggle}
          className={`flex-1 h-[52px] rounded-[14px] font-semibold text-sm transition-all duration-350 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-white ${
            isRunning
              ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600'
              : 'bg-gradient-to-br from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB]'
          }`}
        >
          {isRunning ? (<><Pause className="w-4 h-4" /><span>Pause</span></>) : (<><Play className="w-4 h-4" /><span>Start</span></>)}
        </button>
        <button
          onClick={handleReset}
          className="w-[52px] h-[52px] flex items-center justify-center bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-[14px] border border-slate-600/50 transition-all active:scale-[0.96] cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 w-full p-1 bg-slate-900/40 rounded-xl border border-slate-800/40">
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
              currentSessionDuration === min ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            {min}m
          </button>
        ))}
      </div>
    </div>
  );
}
