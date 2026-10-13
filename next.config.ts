import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Tailwind CSS is ~11 KB: inlining removes the render-blocking stylesheet round trip.
    inlineCss: true,
  },
  images: {
    // Event photos are fetched and transcoded server-side and served same-origin:
    // AVIF/WebP at the exact width, long CDN cache, and no third-party cookies
    // from the image host reaching visitors.
    remotePatterns: [{ protocol: "https", hostname: "images.pexels.com", pathname: "/photos/**" }],
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
    minimumCacheTTL: 2678400,
    deviceSizes: [390, 640, 828, 1080, 1280, 1600],
    imageSizes: [96, 160, 256, 384, 480],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
