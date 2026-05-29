"use client";

/**
 * MusicPlayer — Production-ready hidden audio player component
 *
 * Architecture:
 * 1. Single <audio> element, ref-based, mounted for app lifetime.
 * 2. Race conditions prevented via a generation counter.
 * 3. blob: URLs bypass CORS handling (IndexedDB-owned data).
 * 4. crossOrigin set dynamically before src assignment.
 * 5. play() promise always awaited with full error handling.
 * 6. AbortController cancels stale load operations.
 */

import { useEffect, useRef, useCallback } from "react";
import { useMusicStore } from "@/lib/stores/musicStore";
import {
  loadAudioWithRetry,
  playAudio,
  getAudioStateInfo,
  validateAudioElementState,
} from "@/lib/utils/audioLoader";

export function MusicPlayer() {
  const audioRef     = useRef<HTMLAudioElement>(null);
  const generationRef = useRef(0);
  const abortRef      = useRef<AbortController | null>(null);
  const loadedUrlRef  = useRef<string>("");

  const currentMusic = useMusicStore((s) => s.currentMusic);
  const isPlaying    = useMusicStore((s) => s.isPlaying);
  const volume       = useMusicStore((s) => s.volume);
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying);

  // ── Init & cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = Math.max(0, Math.min(1, volume));

    return () => {
      generationRef.current++;
      abortRef.current?.abort();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Volume sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume));
  }, [volume]);

  // ── crossOrigin helper ────────────────────────────────────────────────────
  // blob:/data: URLs must NOT have crossOrigin set — it causes CORS errors.
  const getCrossOrigin = useCallback((url: string): "anonymous" | null => {
    if (url.startsWith("blob:") || url.startsWith("data:")) return null;
    return "anonymous";
  }, []);

  // ── Main audio engine ─────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const myGeneration = ++generationRef.current;
    const isCurrent = () => generationRef.current === myGeneration;

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const run = async () => {
      // No music selected
      if (!currentMusic?.url) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        loadedUrlRef.current = "";
        return;
      }

      const url = currentMusic.url;

      // Pause requested
      if (!isPlaying) {
        if (!audio.paused) audio.pause();
        return;
      }

      // Set crossOrigin BEFORE src (critical for CORS handshake)
      const crossOrigin = getCrossOrigin(url);
      if (crossOrigin) {
        audio.crossOrigin = crossOrigin;
      } else {
        audio.removeAttribute("crossorigin");
      }

      // Load if source changed
      if (loadedUrlRef.current !== url) {
        const result = await loadAudioWithRetry(audio, url, {
          timeout:       25_000,
          retryAttempts: 3,
          retryDelay:    1_500,
          signal:        abortController.signal,
        });

        if (!isCurrent()) return;

        if (!result.success) {
          console.error(
            `[MusicPlayer] Load failed: ${result.error}\n` +
            `State: ${getAudioStateInfo(audio)}`
          );
          const v = validateAudioElementState(audio);
          if (!v.valid) v.errors.forEach((e) => console.warn("[MusicPlayer]", e));
          setIsPlaying(false);
          return;
        }

        if (!result.alreadyLoaded) {
          loadedUrlRef.current = url;
        }
      }

      // Play
      if (!isCurrent()) return;

      const playResult = await playAudio(audio);

      if (!isCurrent()) return;

      if (!playResult.success) {
        if (!playResult.autoplayBlocked) {
          // autoplayBlocked: keep isPlaying=true so gesture handler retries
          setIsPlaying(false);
        }
        console.warn("[MusicPlayer] Playback error:", playResult.error);
      }
    };

    run().catch((err) => {
      if (!isCurrent()) return;
      console.error("[MusicPlayer] Unhandled error:", err?.message ?? err);
      setIsPlaying(false);
    });
  }, [currentMusic, isPlaying, getCrossOrigin, setIsPlaying]);

  // ── Auto-retry after user gesture (unblock autoplay) ─────────────────────
  useEffect(() => {
    const handleGesture = () => {
      const audio = audioRef.current;
      if (!audio || !isPlaying || !audio.paused || !currentMusic?.url) return;

      playAudio(audio).then((r) => {
        if (!r.success && !r.autoplayBlocked) {
          console.warn("[MusicPlayer] Gesture retry failed:", r.error);
          setIsPlaying(false);
        }
      });
    };

    document.addEventListener("click",      handleGesture, { passive: true });
    document.addEventListener("keydown",    handleGesture, { passive: true });
    document.addEventListener("touchstart", handleGesture, { passive: true });

    return () => {
      document.removeEventListener("click",      handleGesture);
      document.removeEventListener("keydown",    handleGesture);
      document.removeEventListener("touchstart", handleGesture);
    };
  }, [isPlaying, currentMusic, setIsPlaying]);

  // ── Audio element event handlers ──────────────────────────────────────────

  const handleEnded = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    const result = await playAudio(audio);
    if (!result.success) setIsPlaying(false);
  }, [setIsPlaying]);

  const handleError = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.error) return;

    const { code, message } = audio.error;
    const labels: Record<number, string> = {
      1: "MEDIA_ERR_ABORTED",
      2: "MEDIA_ERR_NETWORK",
      3: "MEDIA_ERR_DECODE",
      4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
    };
    console.error(
      `[MusicPlayer] MediaError ${labels[code] ?? code}${message ? `: ${message}` : ""}\n` +
      `State: ${getAudioStateInfo(audio)}`
    );

    if (!audio.paused) audio.pause();
    setIsPlaying(false);
  }, [setIsPlaying]);

  // ── Render — nothing visible ──────────────────────────────────────────────
  return (
    <audio
      ref={audioRef}
      preload="metadata"
      onEnded={handleEnded}
      onError={handleError}
      className="hidden"
      aria-hidden="true"
    />
  );
}
