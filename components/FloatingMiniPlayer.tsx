'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlaylistStore, getDefaultCover } from '@/lib/stores/playlistStore';
import { useMusicStore } from '@/lib/stores/musicStore';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Music,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function FloatingMiniPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    currentSong,
    isPlaying,
    volume,
    shuffle,
    repeat,
    currentTime,
    duration,
    togglePlay,
    setIsPlaying,
    nextSong,
    prevSong,
    setShuffle,
    setRepeat,
    setVolume,
    setCurrentTime,
    setDuration,
  } = usePlaylistStore();

  // Coordinated playback with ambient player
  const ambientIsPlaying = useMusicStore((s) => s.isPlaying);

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const wasPlayingBeforeDrag = useRef(false);

  // Sync ambient music state: if ambient player starts, pause playlist player
  useEffect(() => {
    if (ambientIsPlaying && isPlaying) {
      setIsPlaying(false);
    }
  }, [ambientIsPlaying, isPlaying, setIsPlaying]);

  // Audio Play/Pause Sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Pause ambient just in case
      try {
        useMusicStore.getState().setIsPlaying(false);
      } catch (e) {}

      audio.play().catch((err) => {
        console.warn('[PlaylistPlayer] Playback was interrupted or blocked:', err);
        // Do not force isPlaying to false instantly, let the user click play to retry
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong]);

  // Sync Audio Source & Volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Handle source changes and restoring position
  const initialPositionRestored = useRef(false);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSong?.audioUrl) {
      const isNewSong = audio.src !== currentSong.audioUrl;
      if (isNewSong) {
        audio.src = currentSong.audioUrl;
        audio.load();
        
        // Wait for loaded metadata before playing
        const handleMetadata = () => {
          setDuration(audio.duration || 0);
          
          // Restore position if it's the saved song and we haven't restored yet
          if (!initialPositionRestored.current && currentTime > 0) {
            audio.currentTime = currentTime;
            initialPositionRestored.current = true;
          }
          
          if (isPlaying) {
            audio.play().catch((err) => console.log('Autoplay blocked:', err));
          }
        };

        audio.addEventListener('loadedmetadata', handleMetadata);
        return () => {
          audio.removeEventListener('loadedmetadata', handleMetadata);
        };
      }
    } else {
      audio.src = '';
      setIsPlaying(false);
    }
  }, [currentSong?.audioUrl, setDuration, setIsPlaying]);

  // Format Duration (e.g., 03:45)
  const formatTime = useCallback((time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  // Time Update Handler
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || dragTime !== null) return;
    setCurrentTime(audio.currentTime);
  };

  // Drag Seek Handlers
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVal = parseFloat(e.target.value);
    setDragTime(targetVal);
  };

  const handleSeekEnd = () => {
    const audio = audioRef.current;
    if (!audio || dragTime === null) return;

    audio.currentTime = dragTime;
    setCurrentTime(dragTime);
    setDragTime(null);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolume > 0 ? prevVolume : 0.5);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolume(0);
    }
  };

  // Volume Slider Change
  const handleVolumeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = parseFloat(e.target.value);
    setVolume(nextVol);
    if (nextVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Toggle Repeat Helper
  const handleToggleRepeat = () => {
    if (repeat === 'none') setRepeat('all');
    else if (repeat === 'all') setRepeat('one');
    else setRepeat('none');
  };

  // If no song selected, don't show the player
  if (!currentSong) return null;

  const displayTime = dragTime !== null ? dragTime : currentTime;

  return (
    <div className="fixed z-50 bottom-[88px] md:bottom-6 left-1/2 -translate-x-1/2 w-[92%] sm:w-[85%] md:w-auto md:min-w-[640px] max-w-4xl pointer-events-none">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={nextSong}
        className="hidden"
      />

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="pointer-events-auto w-full bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-3 sm:p-4 flex flex-col gap-2 nav-active-glow"
      >
        {/* Progress Bar (Always visible top of player) */}
        <div className="flex items-center gap-2 w-full text-[10px] text-slate-400 font-medium">
          <span className="w-8 text-right">{formatTime(displayTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={displayTime}
            onChange={handleSeekChange}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400 transition-colors"
          />
          <span className="w-8">{formatTime(duration)}</span>
        </div>

        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Cover & Song Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-initial md:w-56">
            <img
              src={currentSong.coverImage || getDefaultCover(currentSong.id)}
              alt={currentSong.title}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-800"
            />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-[180px]">
                {currentSong.title}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[120px] sm:max-w-[180px]">
                {currentSong.artist || 'Unknown Artist'}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`p-1.5 rounded-lg hover:bg-slate-900/60 transition ${
                shuffle ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4 sm:w-5 h-5" />
            </button>

            <button
              onClick={prevSong}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 transition"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 sm:w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-md hover:shadow-lg transition-transform hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-white" />
              ) : (
                <Play className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-white ml-0.5" />
              )}
            </button>

            <button
              onClick={nextSong}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 transition"
              title="Next"
            >
              <SkipForward className="w-4 h-4 sm:w-5 h-5" />
            </button>

            <button
              onClick={handleToggleRepeat}
              className={`p-1.5 rounded-lg hover:bg-slate-900/60 transition relative ${
                repeat !== 'none'
                  ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={`Repeat: ${repeat}`}
            >
              <Repeat className="w-4 h-4 sm:w-5 h-5" />
              {repeat === 'one' && (
                <span className="absolute -top-0.5 -right-0.5 bg-violet-600 text-[8px] font-bold text-white w-3 h-3 rounded-full flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Volume control */}
          <div className="hidden md:flex items-center gap-2 w-32 justify-end flex-shrink-0">
            <button
              onClick={handleToggleMute}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900/60 transition rounded-lg"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4.5 h-4.5" />
              ) : (
                <Volume2 className="w-4.5 h-4.5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolumeSlider}
              className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Close button to clear queue */}
          <button
            onClick={() => usePlaylistStore.setState({ currentSong: null, isPlaying: false })}
            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition hover:bg-slate-900/40 ml-1.5 flex-shrink-0"
            title="Tutup Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
