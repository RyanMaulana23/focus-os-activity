import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},

  /**
   * HTTP Headers
   *
   * Audio files served from /public need proper CORS + MIME headers so the
   * <audio crossOrigin="anonymous"> element can load them without CORS errors.
   *
   * The browser's audio element enforces CORS when crossOrigin="anonymous" is
   * set, so the server MUST respond with Access-Control-Allow-Origin.
   */
  async headers() {
    return [
      // ── Audio files in /public ──────────────────────────────────────────
      {
        source: "/:path*.mp3",
        headers: audioCorsHeaders,
      },
      {
        source: "/:path*.wav",
        headers: audioCorsHeaders,
      },
      {
        source: "/:path*.ogg",
        headers: audioCorsHeaders,
      },
      {
        source: "/:path*.m4a",
        headers: audioCorsHeaders,
      },
      {
        source: "/:path*.webm",
        headers: audioCorsHeaders,
      },
      {
        source: "/:path*.flac",
        headers: audioCorsHeaders,
      },
      // ── API routes (if any serve audio) ────────────────────────────────
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Range, Content-Type, Accept" },
          { key: "Access-Control-Expose-Headers", value: "Content-Length, Content-Range, Content-Type" },
        ],
      },
    ];
  },
};

/** CORS + caching headers applied to all audio file routes */
const audioCorsHeaders = [
  { key: "Access-Control-Allow-Origin",   value: "*" },
  { key: "Access-Control-Allow-Methods",  value: "GET, HEAD, OPTIONS" },
  { key: "Access-Control-Allow-Headers",  value: "Range, Content-Type, Accept" },
  // Expose Range headers so browsers can implement partial audio loading
  { key: "Access-Control-Expose-Headers", value: "Content-Length, Content-Range, Accept-Ranges" },
  { key: "Accept-Ranges",                 value: "bytes" },
  // Cache audio files for 1 hour in browser, 1 day on CDN
  { key: "Cache-Control",                 value: "public, max-age=3600, s-maxage=86400" },
];

export default nextConfig;
