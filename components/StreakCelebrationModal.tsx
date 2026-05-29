'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Sparkles, X } from 'lucide-react';

interface StreakCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
  habitName: string;
}

export function StreakCelebrationModal({
  isOpen,
  onClose,
  streakCount,
  habitName,
}: StreakCelebrationModalProps) {
  const [soundPlayed, setSoundPlayed] = useState(false);

  // Play a premium synth sound when the modal opens
  useEffect(() => {
    if (isOpen && !soundPlayed) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Synth sound 1: Satisfying deep pop/chime whoosh
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime); // Start deep
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.3); // Rise up
        
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);

        // Synth sound 2: High spark chime
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(800, audioCtx.currentTime);
          osc2.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.15);
          
          gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.3);
        }, 150);

        setSoundPlayed(true);
      } catch (err) {
        console.warn('Audio synthesis failed:', err);
      }
    } else if (!isOpen) {
      setSoundPlayed(false);
    }
  }, [isOpen, soundPlayed]);

  // Generate 18 static configurations for particles so they are stable across renders
  const sparks = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${15 + Math.random() * 70}%`, // Stay closer to center/fire
    size: 3 + Math.random() * 5,
    delay: Math.random() * 1.5,
    duration: 1.5 + Math.random() * 1.5,
    drift: [0, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 40],
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              transition: { type: 'spring', damping: 20, stiffness: 260 }
            }}
            exit={{ scale: 0.95, opacity: 0, y: 15, transition: { duration: 0.2 } }}
            className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_80px_rgba(249,115,22,0.2)] overflow-hidden text-center z-10"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Spark/Ember Particle System */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {sparks.map((spark) => (
                <motion.div
                  key={spark.id}
                  className="absolute bottom-20 bg-gradient-to-t from-amber-400 to-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                  style={{
                    left: spark.left,
                    width: spark.size,
                    height: spark.size,
                  }}
                  animate={{
                    y: [0, -250],
                    x: spark.drift,
                    opacity: [0, 1, 1, 0],
                    scale: [1, 1.2, 0.8, 0],
                  }}
                  transition={{
                    duration: spark.duration,
                    repeat: Infinity,
                    delay: spark.delay,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white rounded-full transition-all active:scale-95 z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
              
              {/* Premium Fire Animation Area */}
              <div className="relative w-36 h-40 flex items-center justify-center mb-2 select-none">
                
                {/* Back Glowing Aura */}
                <motion.div 
                  className="absolute w-24 h-24 bg-red-600/30 rounded-full filter blur-xl"
                  animate={{
                    scale: [1, 1.2, 0.9, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />

                {/* Layered Animated SVG Flame */}
                <svg viewBox="0 0 100 120" className="w-32 h-32 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]">
                  <defs>
                    <linearGradient id="outerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.95" />
                      <stop offset="60%" stopColor="#ea580c" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="midGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#ea580c" stopOpacity="0.95" />
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="innerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.98" />
                      <stop offset="60%" stopColor="#fef08a" stopOpacity="0.98" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>

                  {/* Outer Flame Shape */}
                  <motion.path
                    d="M50 110 C20 110, 10 90, 20 60 C30 30, 45 10, 50 5 C55 10, 70 30, 80 60 C90 90, 80 110, 50 110 Z"
                    fill="url(#outerGrad)"
                    animate={{
                      scaleY: [1, 1.05, 0.96, 1.04, 1],
                      scaleX: [1, 0.94, 1.06, 0.97, 1],
                      rotate: [0, -1, 2, -1, 0],
                      skewX: [0, 1, -2, 1, 0],
                    }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    style={{ transformOrigin: '50% 100%' }}
                  />

                  {/* Middle Flame Shape */}
                  <motion.path
                    d="M50 105 C28 105, 20 90, 28 65 C36 40, 47 22, 50 18 C53 22, 64 40, 72 65 C80 90, 72 105, 50 105 Z"
                    fill="url(#midGrad)"
                    animate={{
                      scaleY: [1, 1.1, 0.94, 1.07, 1],
                      scaleX: [1, 0.91, 1.08, 0.93, 1],
                      rotate: [0, 2, -2, 1, 0],
                      y: [0, -1, 1, 0],
                    }}
                    transition={{
                      duration: 0.65,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: 0.1,
                    }}
                    style={{ transformOrigin: '50% 100%' }}
                  />

                  {/* Inner Flame Shape */}
                  <motion.path
                    d="M50 100 C34 100, 28 90, 34 70 C40 50, 48 35, 50 30 C52 35, 60 50, 66 70 C72 90, 66 100, 50 100 Z"
                    fill="url(#innerGrad)"
                    animate={{
                      scaleY: [1, 1.15, 0.9, 1.1, 1],
                      scaleX: [1, 0.88, 1.12, 0.9, 1],
                      rotate: [0, -2, 3, -1, 0],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: 0.2,
                    }}
                    style={{ transformOrigin: '50% 100%' }}
                  />
                </svg>
              </div>

              {/* Celebration Title */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { delay: 0.1 } }}
                className="flex items-center gap-1.5 px-3 py-1 bg-orange-950/40 text-orange-400 border border-orange-500/25 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Streak On Fire!</span>
              </motion.div>

              {/* Active Streak Count */}
              <motion.h1
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { delay: 0.2 } }}
                className="text-4xl md:text-5xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-500 tracking-tight"
              >
                {streakCount} {streakCount === 1 ? 'Day' : 'Days'} Streak!
              </motion.h1>

              {/* Habit Context */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.3 } }}
                className="text-slate-300 font-semibold text-sm mt-2 max-w-[90%]"
              >
                untuk kebiasaan: <span className="text-white underline decoration-orange-500 decoration-2 underline-offset-2">{habitName}</span>
              </motion.p>

              {/* Premium Supportive Message in Indonesian */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
                className="mt-5 p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl max-w-sm"
              >
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
                  Kamu luar biasa! Konsistensi belajar dan menggunakan{' '}
                  <span className="text-orange-400 font-bold">Focus OS</span> hari ini telah menjaga{' '}
                  <span className="text-amber-300 font-bold">api semangat belajarmu</span> tetap menyala. Tetap fokus, produktif, dan raih impianmu! 🚀🔥
                </p>
              </motion.div>

              {/* Close Button / Call to Action */}
              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
                whileHover={{ scale: 1.04, boxShadow: '0 0 25px rgba(249,115,22,0.45)' }}
                whileTap={{ scale: 0.96 }}
                onClick={onClose}
                className="mt-6 w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-orange-500/20 border border-orange-400/40 active:scale-95 transition-all text-sm uppercase flex items-center justify-center gap-2 group"
              >
                <Flame className="w-5 h-5 text-white group-hover:scale-125 transition-transform" />
                <span>Mantap, Lanjutkan!</span>
              </motion.button>
              
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
