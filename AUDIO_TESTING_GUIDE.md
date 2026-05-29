# 🧪 Audio Testing & Debugging Guide

## Quick Start: Enable Debug Mode

1. **Open MusicPlayer component**
2. **In dev mode (next dev)**, debug panel appears at bottom-left
3. **Click [Clear]** to reset logs
4. **Play audio** and watch logs in real-time

---

## 🧪 Test Cases

### TC-1: Load Valid MP3 File ✅

**Setup:**
```tsx
// In your music store or player
const song = {
  id: "1",
  title: "Valid MP3",
  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
};
```

**Expected Logs:**
```
✅ URL Validated - Format: mp3
[Loading] Attempt 1/3 - Setting source...
[Loading] Attempt 1/3 - Waiting for metadata...
[Loading] Attempt 1/3 - Success!
✅ Audio Loaded Successfully (1 attempts)
▶️  Playing: Valid MP3
[Play] Starting playback...
[Play] Playing
```

**Validation:**
- ✅ Audio plays
- ✅ No errors in console
- ✅ Debug logs show success

---

### TC-2: Load Valid WAV File ✅

**Setup:**
```tsx
const song = {
  id: "2",
  title: "Valid WAV",
  url: "https://www.soundhelix.com/examples/wav/SoundHelix-Song-1.wav"
};
```

**Expected Logs:**
```
✅ URL Validated - Format: wav
✅ Audio Loaded Successfully (1 attempts)
▶️  Playing: Valid WAV
```

**Validation:**
- ✅ Audio plays without format error

---

### TC-3: Invalid URL (404 Not Found) ❌

**Setup:**
```tsx
const song = {
  id: "3",
  title: "Invalid URL",
  url: "https://example.com/nonexistent.mp3"
};
```

**Expected Logs:**
```
🔗 Validating audio URL...
❌ URL Validation Failed: HTTP 404: Not Found
❌ Cannot load: HTTP 404: Not Found
```

**Validation:**
- ✅ Error detected before loading
- ✅ No console errors
- ✅ Playback stopped gracefully

---

### TC-4: Wrong MIME Type ❌

**Setup:**
```tsx
const song = {
  id: "4",
  title: "Wrong MIME Type",
  url: "https://example.com/image.jpg"  // Serving HTML, not audio
};
```

**Expected Logs:**
```
🔗 Validating audio URL...
❌ URL Validation Failed: Invalid MIME type: text/html
❌ Cannot load: Invalid MIME type: text/html
   💡 Fix: Check if format is supported (MP3, WAV, OGG, M4A, WebM, FLAC)
   💡 Fix: Try converting audio to MP3 format
   💡 Fix: Check if file is corrupted
```

**Validation:**
- ✅ MIME type validation works
- ✅ Clear error message
- ✅ Actionable suggestions shown

---

### TC-5: Unsupported Format ❌

**Setup:**
```tsx
const song = {
  id: "5",
  title: "Unsupported Format",
  url: "https://example.com/song.opus"  // OPUS might not be supported
};
```

**Expected Logs:**
```
🔗 Validating audio URL...
❌ URL Validation Failed: Invalid MIME type: audio/opus
```

**Validation:**
- ✅ Format validation detects unsupported
- ✅ Fails before loading

---

### TC-6: Network Error / Offline ❌

**Setup:**
```tsx
// 1. Disable internet connection
// 2. Try to play audio
const song = {
  id: "6",
  title: "Offline Test",
  url: "https://example.com/song.mp3"
};
```

**Expected Logs:**
```
🔗 Validating audio URL...
❌ No internet connection detected
❌ Cannot load: No internet connection detected
   💡 Fix: Check internet connection
```

**Validation:**
- ✅ Network detection works
- ✅ Clear offline message
- ✅ User can reconnect and retry

---

### TC-7: Retry Mechanism (Slow Network) ⏳

**Setup:**
```tsx
// Use browser DevTools to throttle network
// 1. Open DevTools (F12)
// 2. Go to Network tab
// 3. Select "Slow 3G" from throttle dropdown
// 4. Try to play audio with short timeout (for testing)
```

**Expected Logs (with throttling):**
```
📥 Loading new audio source: Test Song
[Loading] Attempt 1/3 - Setting source...
[Loading] Attempt 1/3 - Waiting for metadata...
[Loading] Retrying in 1000ms...
[Loading] Attempt 2/3 - Setting source...
[Loading] Attempt 2/3 - Waiting for metadata...
[Loading] Attempt 2/3 - Success!
✅ Audio Loaded Successfully (2 attempts)
```

**Validation:**
- ✅ First attempt fails
- ✅ Auto retry after delay
- ✅ Second attempt succeeds

---

### TC-8: Large File (>100MB) ❌

**Setup:**
```tsx
const song = {
  id: "8",
  title: "Large File",
  url: "https://example.com/large.mp3"  // File > 100MB
};
```

**Expected Logs:**
```
🔗 Validating audio URL...
❌ URL Validation Failed: Audio file too large (max 100MB)
```

**Validation:**
- ✅ File size validation works
- ✅ Prevents loading oversized files

---

### TC-9: Concurrent Play Attempts ⏳

**Setup:**
```tsx
// 1. Start playing song A
// 2. Quickly click on song B before A loads
// 3. Observe what happens
```

**Expected Logs:**
```
📥 Loading new audio source: Song A
[Loading] Attempt 1/3 - Setting source...
⏳ Loading already in progress...  // Click on Song B
📥 Loading new audio source: Song B  // Eventually loads B
```

**Validation:**
- ✅ Prevents concurrent loads (loadingRef protection)
- ✅ Eventually plays correct song

---

### TC-10: User Interaction Required ⚠️

**Setup:**
```tsx
// 1. Load page without clicking/interacting
// 2. Try to play audio
// 3. Observe autoplay block
// 4. Click somewhere on page
// 5. Try again
```

**Expected Logs (Before click):**
```
📥 Loading new audio source: Test Song
✅ Audio Loaded Successfully (1 attempts)
⏸️  Pausing...  // Not playing because no user interaction yet
```

**After click:**
```
✅ User interaction detected - autoplay enabled
▶️  Playing: Test Song
[Play] Starting playback...
[Play] Playing
```

**Validation:**
- ✅ Autoplay blocked until user interaction
- ✅ Works after interaction detected

---

## 🔧 Manual Testing Checklist

### ✅ Functionality Tests
- [ ] Play single audio file
- [ ] Pause audio
- [ ] Resume audio
- [ ] Change volume
- [ ] Skip to different song
- [ ] Audio loops at end
- [ ] No duplicate playback

### ✅ Format Support Tests
- [ ] MP3 file loads
- [ ] WAV file loads
- [ ] OGG file loads
- [ ] Unsupported format shows error

### ✅ Error Handling Tests
- [ ] Invalid URL shows error
- [ ] 404 URL shows error
- [ ] Wrong MIME type shows error
- [ ] Offline mode shows error
- [ ] Timeout shows error

### ✅ Edge Cases
- [ ] Very large file (>50MB) rejected
- [ ] Very small file (<1KB) loads
- [ ] Slow network with retry works
- [ ] Rapid song changes works
- [ ] Page refresh preserves state

### ✅ Console & Logs
- [ ] No uncaught errors in console
- [ ] No unhandled promise rejections
- [ ] Debug logs clear and readable
- [ ] Timestamps consistent

---

## 📊 Network Throttling Tests

### Enable Throttling in DevTools

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Find "Throttle" dropdown** (usually shows "No throttling")
4. **Select preset speed:**
   - No throttling (baseline)
   - Slow 3G (slow network test)
   - Fast 3G (decent network test)
   - 4G (fast network test)

### Test Cases with Throttling

| Speed | Expected | Actual | Pass |
|-------|----------|--------|------|
| No throttle | Instant load | Load in <1s | ✅ |
| Slow 3G | Retry & succeed | 2 attempts, success | ✅ |
| Fast 3G | Quick load | Load in <500ms | ✅ |
| 4G | Very quick | Load in <200ms | ✅ |

---

## 🐛 Debugging Commands

### Log Browser Supported Formats
```javascript
// In browser console:
import { getBrowserSupportedFormats } from "@/lib/utils/audioValidator";
console.log(getBrowserSupportedFormats());
```

### Validate Specific URL
```javascript
// In browser console:
import { validateAudioUrl } from "@/lib/utils/audioValidator";
const result = await validateAudioUrl("https://example.com/song.mp3");
console.log(result);
```

### Check MIME Type
```bash
# From terminal:
curl -I https://example.com/song.mp3
# Look for: Content-Type: audio/mpeg
```

### Convert Audio Format
```bash
# Using ffmpeg:
ffmpeg -i original.wav -acodec libmp3lame -ab 192k output.mp3
ffmpeg -i original.mp3 output.wav
ffmpeg -i original.wav output.ogg
```

---

## 📈 Performance Monitoring

### Metrics to Track
```tsx
// Add to debug log:
const startTime = performance.now();
// ... do something ...
const duration = performance.now() - startTime;
console.log(`Operation took ${duration.toFixed(2)}ms`);
```

### Typical Times
| Operation | Expected | Good | Slow |
|-----------|----------|------|------|
| URL validation (HEAD request) | <500ms | <1s | >3s |
| Metadata load | <1s | <2s | >5s |
| Playback start | <100ms | <500ms | >2s |
| Complete flow | <2s | <5s | >10s |

---

## 🚨 Common Errors & Fixes

### Error: "canPlayType returns undefined"
```tsx
// ❌ Wrong:
const canPlay = audio.canPlayType("audio/mpeg");
if (canPlay) { /* ... */ }

// ✅ Right:
const canPlay = audio.canPlayType("audio/mpeg");
if (canPlay === "probably" || canPlay === "maybe") { /* ... */ }
```

### Error: "Audio element is null"
```tsx
// ❌ Wrong:
const audio = audioRef.current;
audio.play();  // Could be null!

// ✅ Right:
const audio = audioRef.current;
if (!audio) return;
await audio.play();
```

### Error: "Unhandled promise rejection"
```tsx
// ❌ Wrong:
audio.play();  // Fire and forget

// ✅ Right:
try {
  await audio.play();
} catch (error) {
  if (error.name !== "AbortError") {
    console.error("Play error:", error);
  }
}
```

---

## 🎯 Regression Testing

### Before Any Changes
1. **Record baseline**: Play audio, note logs
2. **Document**: Save expected behavior

### After Any Changes
1. **Run tests**: TC-1 through TC-10
2. **Compare**: Match baseline behavior
3. **Check**: No new errors in console
4. **Validate**: All features still work

---

## 📞 When Tests Fail

### Step 1: Check Logs
- Read debug panel carefully
- Look for exact error message
- Note which step failed

### Step 2: Validate Manually
- Open URL in browser address bar
- Check if audio plays directly
- Check developer tools Network tab
- Check Content-Type header

### Step 3: Check Configuration
- Verify CORS headers if needed
- Verify MIME type on server
- Verify file exists and readable
- Verify no authentication required

### Step 4: Check System
- Test internet connection: `ping google.com`
- Check browser compatibility: https://caniuse.com/audio
- Check browser console for cross-origin errors
- Try different browser if available

---

## ✅ Testing Checklist (Before Production)

- [ ] All TC-1 to TC-10 pass
- [ ] No console errors
- [ ] Debug logs are clear
- [ ] Audio plays correctly
- [ ] Error messages are helpful
- [ ] Retry mechanism works
- [ ] Network detection works
- [ ] Format validation works
- [ ] Large files rejected
- [ ] Performance acceptable

---

**🎉 Ready to test! Start with TC-1 and work through the list.**
