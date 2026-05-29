# 🚀 Audio Utilities API Reference

## Audio Validator (`lib/utils/audioValidator.ts`)

### Functions

#### 1. `canPlayAudioFormat(mimeType: string): boolean`

Check if browser can play a specific MIME type.

```tsx
import { canPlayAudioFormat } from "@/lib/utils/audioValidator";

// Check single format
if (canPlayAudioFormat("audio/mpeg")) {
  console.log("✅ Browser supports MP3");
}

// Check multiple formats
const formats = ["audio/mpeg", "audio/wav", "audio/ogg"];
const supported = formats.filter(canPlayAudioFormat);
console.log("Supported formats:", supported);
```

---

#### 2. `getAudioFormatFromUrl(url: string): AudioFormat | null`

Extract audio format from URL pathname.

```tsx
import { getAudioFormatFromUrl } from "@/lib/utils/audioValidator";

const format = getAudioFormatFromUrl("https://example.com/song.mp3");
console.log(format); // "mp3"

const format2 = getAudioFormatFromUrl("https://example.com/song.wav");
console.log(format2); // "wav"

const format3 = getAudioFormatFromUrl("https://example.com/song.txt");
console.log(format3); // null
```

---

#### 3. `isValidAudioMimeType(contentType: string | null): {valid: boolean; format?: AudioFormat}`

Validate MIME type from Content-Type header.

```tsx
import { isValidAudioMimeType } from "@/lib/utils/audioValidator";

const result1 = isValidAudioMimeType("audio/mpeg");
console.log(result1); // {valid: true, format: "mp3"}

const result2 = isValidAudioMimeType("audio/mpeg; charset=utf-8");
console.log(result2); // {valid: true, format: "mp3"} (charset ignored)

const result3 = isValidAudioMimeType("text/html");
console.log(result3); // {valid: false}

const result4 = isValidAudioMimeType(null);
console.log(result4); // {valid: false}
```

---

#### 4. `isValidAudioFileSize(contentLength: string | null): boolean`

Check if file size is within limits (max 100MB).

```tsx
import { isValidAudioFileSize } from "@/lib/utils/audioValidator";

// Check file size from Content-Length header
const isValid1 = isValidAudioFileSize("5242880"); // 5MB
console.log(isValid1); // true

const isValid2 = isValidAudioFileSize("104857600"); // 100MB
console.log(isValid2); // true

const isValid3 = isValidAudioFileSize("157286400"); // 150MB
console.log(isValid3); // false (too large)

// No size info = can't validate
const isValid4 = isValidAudioFileSize(null);
console.log(isValid4); // true (assume valid)
```

---

#### 5. `async validateAudioUrl(url: string, timeout?: number): Promise<{...}>`

Make HEAD request to validate audio URL before loading.

```tsx
import { validateAudioUrl } from "@/lib/utils/audioValidator";

// Simple validation
const result = await validateAudioUrl("https://example.com/song.mp3");
if (result.valid) {
  console.log("✅ Audio is valid:", result.format);
} else {
  console.log("❌ Audio is invalid:", result.error);
}

// Custom timeout
const result2 = await validateAudioUrl(url, 5000); // 5 second timeout

// Example results:
const validResult = {
  valid: true,
  format: "mp3"
};

const invalidResult1 = {
  valid: false,
  error: "HTTP 404: Not Found"
};

const invalidResult2 = {
  valid: false,
  error: "Invalid MIME type: text/html"
};

const invalidResult3 = {
  valid: false,
  error: "Audio file too large (max 100MB)"
};

const invalidResult4 = {
  valid: false,
  error: "Network error or CORS blocked"
};

const invalidResult5 = {
  valid: false,
  error: "Validation timeout (10s)"
};
```

---

#### 6. `getBrowserSupportedFormats(): AudioFormat[]`

Get list of audio formats supported by browser.

```tsx
import { getBrowserSupportedFormats } from "@/lib/utils/audioValidator";

const formats = getBrowserSupportedFormats();
console.log(formats); // ["mp3", "wav", "ogg", "m4a"]

// Use in conditional rendering
if (formats.includes("ogg")) {
  // Can use OGG files
}

// Use in fallback logic
const preferredFormats = ["mp3", "wav", "ogg"];
const fallback = preferredFormats.find(f => formats.includes(f));
```

---

#### 7. `getAudioErrorMessage(errorCode?: number, errorMessage?: string, context?: string): string`

Create user-friendly error message.

```tsx
import { getAudioErrorMessage } from "@/lib/utils/audioValidator";

// Just error code
const msg1 = getAudioErrorMessage(3);
// "Format audio tidak didukung browser Anda"

// With error message
const msg2 = getAudioErrorMessage(3, "MEDIA_ERR_DECODE");
// "Format audio tidak didukung browser Anda (MEDIA_ERR_DECODE)"

// With context
const msg3 = getAudioErrorMessage(4, undefined, "file not found on server");
// "File audio tidak ditemukan atau tidak dapat diakses - file not found on server"

// Full message
const msg4 = getAudioErrorMessage(2, "Connection timeout", "slow network");
// "Kesalahan jaringan - tidak dapat memuat audio (Connection timeout) - slow network"
```

---

#### 8. `SUPPORTED_AUDIO_FORMATS`

Constant object with all supported formats and their configs.

```tsx
import { SUPPORTED_AUDIO_FORMATS } from "@/lib/utils/audioValidator";

// See all supported formats
console.log(Object.keys(SUPPORTED_AUDIO_FORMATS));
// ["mp3", "wav", "ogg", "m4a", "webm", "flac"]

// Get format config
const mp3Config = SUPPORTED_AUDIO_FORMATS.mp3;
// {
//   mimeTypes: ["audio/mpeg", "audio/mp3", "audio/x-mpeg"],
//   extensions: [".mp3"],
//   canPlayType: "audio/mpeg"
// }

// List all MIME types
Object.values(SUPPORTED_AUDIO_FORMATS).forEach(config => {
  console.log(config.mimeTypes);
});
```

---

## Audio Loader (`lib/utils/audioLoader.ts`)

### Functions

#### 1. `isAudioReady(audio: HTMLAudioElement): boolean`

Check if audio element has loaded enough data to play.

```tsx
import { isAudioReady } from "@/lib/utils/audioLoader";

const audio = document.querySelector("audio")!;

if (isAudioReady(audio)) {
  console.log("✅ Ready to play");
  audio.play();
} else {
  console.log("⏳ Still loading metadata");
}
```

---

#### 2. `async waitForAudioReady(audio: HTMLAudioElement, timeout?: number): Promise<void>`

Wait for audio to be ready with timeout protection.

```tsx
import { waitForAudioReady } from "@/lib/utils/audioLoader";

const audio = document.querySelector("audio")!;

try {
  // Wait up to 30 seconds
  await waitForAudioReady(audio, 30000);
  console.log("✅ Audio ready");
  await audio.play();
} catch (error) {
  console.error("❌ Audio failed to load:", error.message);
}
```

---

#### 3. `async loadAudioWithRetry(audio: HTMLAudioElement, url: string, options?: AudioLoadOptions): Promise<AudioLoadResult>`

Load audio with automatic retry on failure.

```tsx
import { loadAudioWithRetry } from "@/lib/utils/audioLoader";

const audio = document.querySelector("audio")!;

// Simple usage
const result = await loadAudioWithRetry(audio, "https://example.com/song.mp3");
if (result.success) {
  console.log(`✅ Loaded in ${result.attemptsUsed} attempt(s)`);
} else {
  console.log(`❌ Failed: ${result.error}`);
}

// With options
const result2 = await loadAudioWithRetry(
  audio,
  "https://example.com/song.mp3",
  {
    timeout: 60000, // 60 seconds
    retryAttempts: 3, // Try 3 times total
    retryDelay: 2000, // Wait 2 seconds between retries
    onProgress: (message) => {
      console.log(`[Audio] ${message}`);
      // Update UI with loading progress
    }
  }
);

// Result types:
// Success: { success: true, attemptsUsed: 1 }
// Failure: { success: false, error: "...", attemptsUsed: 2 }
```

---

#### 4. `async playAudio(audio: HTMLAudioElement, onProgress?: (message: string) => void): Promise<{...}>`

Play audio with error handling.

```tsx
import { playAudio } from "@/lib/utils/audioLoader";

const audio = document.querySelector("audio")!;

// Simple usage
const result = await playAudio(audio);
if (result.success) {
  console.log("▶️  Playing");
} else {
  console.log(`❌ Error: ${result.error}`);
}

// With progress callback
const result2 = await playAudio(audio, (message) => {
  console.log(message);
  // "[Play] Starting playback..."
  // "[Play] Playing"
  // Or error: "[Play] Blocked - User interaction required"
});

// Result types:
// Success: { success: true }
// Failure: { success: false, error: "..." }
```

---

#### 5. `async checkNetworkConnectivity(timeout?: number): Promise<boolean>`

Check if device has internet connection.

```tsx
import { checkNetworkConnectivity } from "@/lib/utils/audioLoader";

// Check with default timeout (5 seconds)
const isOnline = await checkNetworkConnectivity();
if (isOnline) {
  console.log("✅ Internet connected");
} else {
  console.log("❌ No internet connection");
}

// Custom timeout
const isOnline2 = await checkNetworkConnectivity(10000);
```

---

#### 6. `validateAudioElementState(audio: HTMLAudioElement | null): {valid: boolean; errors: string[]}`

Validate audio element state and get error details.

```tsx
import { validateAudioElementState } from "@/lib/utils/audioLoader";

const audio = document.querySelector("audio");
const validation = validateAudioElementState(audio);

if (validation.valid) {
  console.log("✅ Audio element is valid");
} else {
  console.log("❌ Audio element has issues:");
  validation.errors.forEach(error => {
    console.log(`  - ${error}`);
  });
}

// Example validation.errors:
// ["Audio element not found"]
// ["No audio source set", "Audio error code 3: Format not supported"]
// ["Network idle (no source)"]
```

---

#### 7. `getAudioStateInfo(audio: HTMLAudioElement | null): string`

Get human-readable audio state information.

```tsx
import { getAudioStateInfo } from "@/lib/utils/audioLoader";

const audio = document.querySelector("audio");
const stateInfo = getAudioStateInfo(audio);

console.log(stateInfo);
// "Ready: Enough data to play | Network: Loading | Duration: 120.50s | Current: 45.25s | Paused: false | Source: Set"

// Use in debug UI or error reporting
if (audio.error) {
  const stateInfo = getAudioStateInfo(audio);
  console.error(`Audio error. State: ${stateInfo}`);
}
```

---

## Complete Example: Custom Audio Component

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  validateAudioUrl,
  getBrowserSupportedFormats,
} from "@/lib/utils/audioValidator";
import {
  loadAudioWithRetry,
  playAudio,
  checkNetworkConnectivity,
  getAudioStateInfo,
} from "@/lib/utils/audioLoader";

export function CustomAudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check network first
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        throw new Error("No internet connection");
      }

      // Validate URL
      const validation = await validateAudioUrl(url);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Load with retry
      const result = await loadAudioWithRetry(audio, url);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Play
      const playResult = await playAudio(audio);
      if (!playResult.success) {
        throw new Error(playResult.error);
      }

      setIsPlaying(true);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <audio ref={audioRef} crossOrigin="anonymous" />

      <button
        onClick={handlePlay}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {isLoading ? "Loading..." : isPlaying ? "Playing" : "Play"}
      </button>

      {error && <div className="mt-2 text-red-500">{error}</div>}
    </div>
  );
}
```

---

## TypeScript Types

```tsx
// From audioValidator.ts
export type AudioFormat = 
  | "mp3" 
  | "wav" 
  | "ogg" 
  | "m4a" 
  | "webm" 
  | "flac";

// From audioLoader.ts
export interface AudioLoadOptions {
  timeout?: number;           // Default: 30000ms
  retryAttempts?: number;     // Default: 2
  retryDelay?: number;        // Default: 1000ms
  onProgress?: (message: string) => void;
}

export interface AudioLoadResult {
  success: boolean;
  error?: string;
  attemptsUsed?: number;
  format?: string;
}
```

---

## Error Codes Reference

```tsx
// From HTML Audio Element API
const errorCodes = {
  1: "MEDIA_ERR_ABORTED",      // Playback was aborted
  2: "MEDIA_ERR_NETWORK",      // Network error
  3: "MEDIA_ERR_DECODE",       // Decoding error (format not supported)
  4: "MEDIA_ERR_SRC_NOT_SUPPORTED" // Source not supported
};

// Ready states
const readyStates = {
  0: "HAVE_NOTHING",           // No data loaded
  1: "HAVE_METADATA",          // Metadata loaded
  2: "HAVE_CURRENT_DATA",      // Current frame available
  3: "HAVE_FUTURE_DATA",       // Future data available
  4: "HAVE_ENOUGH_DATA"        // Enough to play to end
};

// Network states
const networkStates = {
  0: "NETWORK_EMPTY",          // Not initialized
  1: "NETWORK_IDLE",           // Not loading
  2: "NETWORK_LOADING",        // Currently downloading
  3: "NETWORK_NO_SOURCE"       // No source set
};
```

---

## Best Practices

✅ **Always validate URL before loading**
```tsx
const validation = await validateAudioUrl(url);
if (!validation.valid) {
  handleError(validation.error);
  return;
}
```

✅ **Use retry mechanism for resilience**
```tsx
const result = await loadAudioWithRetry(audio, url, {
  retryAttempts: 2
});
```

✅ **Check network connectivity first**
```tsx
const isOnline = await checkNetworkConnectivity();
if (!isOnline) {
  showErrorMessage("No internet connection");
  return;
}
```

✅ **Handle async errors properly**
```tsx
try {
  await playAudio(audio);
} catch (error: any) {
  if (error.name !== "AbortError") {
    handleError(error.message);
  }
}
```

✅ **Clean up event listeners**
```tsx
return () => {
  if (audio) {
    audio.removeEventListener("play", handlePlay);
    audio.removeEventListener("error", handleError);
  }
};
```

---

**🎵 Happy audio playing! 🎵**
