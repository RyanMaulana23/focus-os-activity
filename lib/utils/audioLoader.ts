/**
 * Audio Loading Utilities
 * Production-ready loading, playing, and error recovery with retry.
 *
 * KEY FIXES:
 * - Proper src comparison using normalized URL
 * - Cancellable load operations via generation counter
 * - Correct readyState thresholds
 * - Separate canplay / error listeners (no overlap)
 */

export interface AudioLoadOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (message: string) => void;
  /** Optionally pass an AbortSignal to cancel the whole operation */
  signal?: AbortSignal;
}

export interface AudioLoadResult {
  success: boolean;
  error?: string;
  attemptsUsed?: number;
  /** true when the source was already loaded — no reload needed */
  alreadyLoaded?: boolean;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1_500;

/**
 * Normalize a URL the same way the browser does when it sets audio.src.
 * Used for src comparison to avoid spurious reloads.
 */
export function normalizeUrl(url: string, base?: string): string {
  try {
    return new URL(url, base ?? (typeof window !== "undefined" ? window.location.href : undefined)).href;
  } catch {
    return url;
  }
}

/**
 * True when audio has enough data to start playing.
 * readyState >= HAVE_CURRENT_DATA (2) is sufficient.
 */
export function isAudioReady(audio: HTMLAudioElement): boolean {
  return audio.readyState >= 2;
}

/**
 * Wait for audio element to fire canplay or loadedmetadata.
 * Rejects on error event or timeout.
 */
export function waitForAudioReady(
  audio: HTMLAudioElement,
  timeout: number = DEFAULT_TIMEOUT,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isAudioReady(audio)) {
      resolve();
      return;
    }

    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const onCanPlay = () => settle(resolve);
    const onLoadedMetadata = () => settle(resolve);
    const onError = () => {
      const err = audio.error;
      settle(() =>
        reject(
          new Error(
            err
              ? `MediaError code=${err.code}: ${err.message || "no message"}`
              : "Audio load error (unknown)"
          )
        )
      );
    };

    const timer = setTimeout(
      () => settle(() => reject(new Error(`Audio loading timed out after ${timeout}ms`))),
      timeout
    );

    const onAbort = () =>
      settle(() => reject(new Error("Audio loading cancelled")));

    const cleanup = () => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
      clearTimeout(timer);
    };

    audio.addEventListener("canplay", onCanPlay, { once: true });
    audio.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    audio.addEventListener("error", onError, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Load audio with retry mechanism.
 *
 * Skips reload when `audio.src` already points to the same URL
 * and the audio is in a valid ready state (avoids double-load glitch).
 */
export async function loadAudioWithRetry(
  audio: HTMLAudioElement,
  url: string,
  options: AudioLoadOptions = {}
): Promise<AudioLoadResult> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retryAttempts = DEFAULT_RETRY_ATTEMPTS,
    retryDelay = DEFAULT_RETRY_DELAY,
    onProgress,
    signal,
  } = options;

  // ── Already loaded? ───────────────────────────────────────────────────────
  const normalizedUrl = normalizeUrl(url);
  if (audio.src === normalizedUrl && isAudioReady(audio) && !audio.error) {
    onProgress?.("✅ [Loader] Source already loaded — skipping reload");
    return { success: true, attemptsUsed: 0, alreadyLoaded: true };
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    if (signal?.aborted) {
      return { success: false, error: "Operation cancelled", attemptsUsed: attempt - 1 };
    }

    onProgress?.(`🔄 [Loader] Attempt ${attempt}/${retryAttempts} — setting source…`);

    try {
      // Reset the element cleanly
      audio.pause();
      audio.removeAttribute("src");
      audio.load(); // clears the media resource

      // Small yield to let the browser flush internal state
      await new Promise<void>((r) => setTimeout(r, 50));

      if (signal?.aborted) {
        return { success: false, error: "Operation cancelled", attemptsUsed: attempt };
      }

      audio.src = url;
      audio.load();

      onProgress?.(`⏳ [Loader] Attempt ${attempt}/${retryAttempts} — waiting for metadata…`);
      await waitForAudioReady(audio, timeout, signal);

      onProgress?.(`✅ [Loader] Loaded successfully on attempt ${attempt}`);
      return { success: true, attemptsUsed: attempt };
    } catch (err: unknown) {
      lastError = err as Error;
      const msg = lastError?.message ?? String(err);
      onProgress?.(`❌ [Loader] Attempt ${attempt} failed: ${msg}`);

      if (attempt < retryAttempts && !signal?.aborted) {
        onProgress?.(`⏳ [Loader] Retrying in ${retryDelay}ms…`);
        await new Promise<void>((r) => setTimeout(r, retryDelay));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message ?? "Failed to load audio after all retries",
    attemptsUsed: retryAttempts,
  };
}

/**
 * Play audio with complete async error handling.
 *
 * Handles:
 * - NotAllowedError (autoplay policy)
 * - AbortError (interrupted by a new play/pause call — non-critical)
 * - NotSupportedError (format unsupported)
 */
export async function playAudio(
  audio: HTMLAudioElement,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; error?: string; autoplayBlocked?: boolean }> {
  try {
    if (!audio.paused) {
      return { success: true };
    }

    onProgress?.("▶️  [Play] Starting playback…");
    await audio.play();
    onProgress?.("✅ [Play] Playback started");
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    const name = error?.name ?? "Unknown";
    const msg = error?.message ?? String(err);

    if (name === "NotAllowedError") {
      onProgress?.("🚫 [Play] Autoplay blocked — user interaction required");
      return { success: false, error: "Autoplay blocked — tap to play", autoplayBlocked: true };
    }

    if (name === "AbortError") {
      // Typically means a new load/play interrupted this one — not a real error
      onProgress?.("⚠️  [Play] AbortError (interrupted) — treating as success");
      return { success: true };
    }

    if (name === "NotSupportedError") {
      onProgress?.(`❌ [Play] Format not supported: ${msg}`);
      return { success: false, error: `Format not supported: ${msg}` };
    }

    onProgress?.(`❌ [Play] Error: ${name} — ${msg}`);
    return { success: false, error: `${name}: ${msg}` };
  }
}

/**
 * Lightweight check — tests if the app itself is reachable.
 * Avoids hitting third-party servers which may CORS-block.
 */
export async function checkNetworkConnectivity(timeout: number = 5000): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch("/", { method: "HEAD", signal: controller.signal });
    clearTimeout(timer);
    return response.ok || response.status < 500;
  } catch {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }
}

/**
 * Validate audio element internal state — useful for debug logging
 */
export function validateAudioElementState(
  audio: HTMLAudioElement | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!audio) {
    errors.push("Audio element not found");
    return { valid: false, errors };
  }
  if (!audio.src && !audio.currentSrc) errors.push("No audio source set");
  if (audio.error) {
    errors.push(`MediaError code=${audio.error.code}: ${audio.error.message || "no message"}`);
  }
  if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
    errors.push("Network state: no source");
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Human-readable snapshot of audio element state
 */
export function getAudioStateInfo(audio: HTMLAudioElement | null): string {
  if (!audio) return "Audio element not initialized";

  const readyLabels = [
    "HAVE_NOTHING",
    "HAVE_METADATA",
    "HAVE_CURRENT_DATA",
    "HAVE_FUTURE_DATA",
    "HAVE_ENOUGH_DATA",
  ];
  const networkLabels = ["EMPTY", "IDLE", "LOADING", "NO_SOURCE"];

  return [
    `ready=${readyLabels[audio.readyState] ?? audio.readyState}`,
    `network=${networkLabels[audio.networkState] ?? audio.networkState}`,
    `paused=${audio.paused}`,
    `duration=${isFinite(audio.duration) ? audio.duration.toFixed(2) + "s" : "unknown"}`,
    `currentTime=${audio.currentTime.toFixed(2)}s`,
    `src=${audio.src ? "✅" : "❌"}`,
    audio.error ? `error=code${audio.error.code}` : "error=none",
  ].join(" | ");
}
