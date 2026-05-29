/**
 * Audio Validation Utilities
 * Handles MIME type validation, format checking, and audio file validation
 *
 * KEY FIX: blob: URLs must bypass HEAD validation entirely.
 * KEY FIX: Never use credentials:"include" with crossOrigin="anonymous" — they conflict.
 */

// Supported audio MIME types and their extensions
export const SUPPORTED_AUDIO_FORMATS = {
  mp3: {
    mimeTypes: ["audio/mpeg", "audio/mp3", "audio/x-mpeg"],
    extensions: [".mp3"],
    canPlayType: "audio/mpeg",
  },
  wav: {
    mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave"],
    extensions: [".wav"],
    canPlayType: "audio/wav",
  },
  ogg: {
    mimeTypes: ["audio/ogg", "audio/vorbis"],
    extensions: [".ogg", ".oga"],
    canPlayType: "audio/ogg",
  },
  m4a: {
    mimeTypes: ["audio/mp4", "audio/x-m4a"],
    extensions: [".m4a", ".m4b"],
    canPlayType: "audio/mp4",
  },
  webm: {
    mimeTypes: ["audio/webm"],
    extensions: [".webm"],
    canPlayType: "audio/webm",
  },
  flac: {
    mimeTypes: ["audio/flac"],
    extensions: [".flac"],
    canPlayType: "audio/flac",
  },
} as const;

export type AudioFormat = keyof typeof SUPPORTED_AUDIO_FORMATS;

/**
 * Validate if browser supports audio format
 */
export function canPlayAudioFormat(mimeType: string): boolean {
  if (typeof document === "undefined") return false;
  const audio = new Audio();
  const canPlay = audio.canPlayType(mimeType);
  return canPlay === "probably" || canPlay === "maybe";
}

/**
 * Extract format from URL pathname
 */
export function getAudioFormatFromUrl(url: string): AudioFormat | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    for (const [format, config] of Object.entries(SUPPORTED_AUDIO_FORMATS)) {
      for (const ext of config.extensions) {
        if (pathname.endsWith(ext)) {
          return format as AudioFormat;
        }
      }
    }
  } catch {
    // invalid URL
  }
  return null;
}

/**
 * Validate MIME type from Content-Type header
 */
export function isValidAudioMimeType(
  contentType: string | null
): { valid: boolean; format?: AudioFormat } {
  if (!contentType) return { valid: false };

  const mimeType = contentType.split(";")[0].trim().toLowerCase();

  for (const [format, config] of Object.entries(SUPPORTED_AUDIO_FORMATS)) {
    if ((config.mimeTypes as readonly string[]).includes(mimeType)) {
      return { valid: true, format: format as AudioFormat };
    }
  }

  return { valid: false };
}

/**
 * Validate audio file size (max 200MB)
 */
export function isValidAudioFileSize(contentLength: string | null): boolean {
  if (!contentLength) return true;
  const sizeInBytes = parseInt(contentLength, 10);
  const maxSizeInBytes = 200 * 1024 * 1024; // 200MB
  if (isNaN(sizeInBytes)) return true;
  return sizeInBytes <= maxSizeInBytes;
}

/**
 * Validate audio URL.
 *
 * Strategy:
 * 1. blob: URLs → always valid (created by us from IndexedDB, no CORS issue)
 * 2. data: URLs → always valid
 * 3. Relative / same-origin → try HEAD without credentials to avoid CORS conflict
 * 4. Cross-origin → try HEAD; if CORS blocks it, fall back to "assume valid"
 *    so the audio element itself can attempt loading.
 */
export async function validateAudioUrl(
  url: string,
  timeout: number = 8000
): Promise<{ valid: boolean; format?: AudioFormat; error?: string; skipped?: boolean }> {
  // ─── 1. blob: / data: → trust immediately ────────────────────────────────
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    console.log("[AudioValidator] blob/data URL — skipping HEAD check ✅");
    return { valid: true, skipped: true };
  }

  // ─── 2. Try HEAD request (no credentials — avoids CORS conflict) ──────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      // ⚠️ Do NOT use credentials:"include" when crossOrigin="anonymous" is set on <audio>
      // Using "omit" matches the anonymous CORS mode of the audio element
      credentials: "omit",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("content-type");
    const mimeValidation = isValidAudioMimeType(contentType);

    // If MIME type header is absent/wrong, don't reject — some CDNs return
    // generic MIME types for audio files. Fall back to URL-extension check.
    if (!mimeValidation.valid) {
      const formatFromUrl = getAudioFormatFromUrl(url);
      if (formatFromUrl) {
        console.log(
          `[AudioValidator] MIME mismatch (${contentType}) but URL extension is ${formatFromUrl} — accepting ✅`
        );
        return { valid: true, format: formatFromUrl };
      }
      return {
        valid: false,
        error: `Invalid MIME type: ${contentType ?? "unknown"}`,
      };
    }

    const contentLength = response.headers.get("content-length");
    if (!isValidAudioFileSize(contentLength)) {
      return { valid: false, error: "Audio file too large (max 200MB)" };
    }

    return { valid: true, format: mimeValidation.format };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const error = err as Error;

    if (error?.name === "AbortError") {
      // Timeout — assume valid so audio element can try
      console.warn("[AudioValidator] HEAD request timed out — assuming valid");
      return { valid: true, skipped: true };
    }

    // CORS / network error during HEAD → don't block playback.
    // The audio element uses a different CORS path and may succeed.
    console.warn(
      "[AudioValidator] HEAD request failed (likely CORS) — assuming valid:",
      error?.message
    );
    return { valid: true, skipped: true };
  }
}

/**
 * Get browser supported audio formats
 */
export function getBrowserSupportedFormats(): AudioFormat[] {
  if (typeof document === "undefined") return [];
  const supported: AudioFormat[] = [];
  for (const [format, config] of Object.entries(SUPPORTED_AUDIO_FORMATS)) {
    if (canPlayAudioFormat(config.canPlayType)) {
      supported.push(format as AudioFormat);
    }
  }
  return supported;
}

/**
 * Create user-friendly error message
 */
export function getAudioErrorMessage(
  errorCode?: number,
  errorMessage?: string,
  context?: string
): string {
  const errorMessages: Record<number, string> = {
    1: "Pemutaran audio dibatalkan",
    2: "Kesalahan jaringan - tidak dapat memuat audio",
    3: "Format audio tidak didukung browser Anda",
    4: "File audio tidak ditemukan atau tidak dapat diakses",
  };

  let message = errorMessages[errorCode ?? -1] ?? "Kesalahan tidak diketahui";
  if (errorMessage) message += ` (${errorMessage})`;
  if (context) message += ` - ${context}`;
  return message;
}
