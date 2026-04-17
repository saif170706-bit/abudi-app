import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.postimg.cc', pathname: '/**' },
    ],
    // Task 18: Reduce image optimizer load — use WebP by default
    formats: ['image/webp'],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Task 18: Enable optimized package imports to reduce bundle size
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
    ],
  },

  // Task 18: Turbopack equivalent for modern development
  turbopack: {
    resolveAlias: {
      'firebase/app': 'firebase/app',
      'firebase/firestore': 'firebase/firestore',
      'stream-chat': 'stream-chat',
    },
  },

  // Task 18: Webpack optimisations for large JSON assets
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split vendor chunks more aggressively
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: 'all',
          maxSize: 200_000, // 200 KB max chunk (keeps TTI low)
          cacheGroups: {
            // Isolate framer-motion into its own chunk (lazy on first load)
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
              priority: 30,
            },
            // Firebase into its own chunk
            firebase: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              name: 'firebase',
              chunks: 'all',
              priority: 20,
            },
            // Stream.io into its own chunk
            stream: {
              test: /[\\/]node_modules[\\/](stream-chat|stream-chat-react|@stream-io)[\\/]/,
              name: 'stream-io',
              chunks: 'all',
              priority: 20,
            },
            // Everything else vendors
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };
    }
    return config;
  },

  // Task 18: Static asset headers — long cache for immutable Quran fonts
  async headers() {
    return [
      // ── Security headers — applied to every route ────────────────────────────
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking — no embedding in iframes
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing attacks
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Force HTTPS for 2 years, include subdomains
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Limit referrer info sent to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Basic XSS protection for legacy browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // GLOBAL: Allow microphone, camera, geolocation and wake-lock for the app
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), screen-wake-lock=(self)' },
        ],
      },
      // ── Dashboard pages — fully static HTML shells, cache at CDN edge ──
      {
        source: '/student',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=31536000, stale-while-revalidate=86400' }],
      },
      {
        source: '/teacher-dashboard',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=31536000, stale-while-revalidate=86400' }],
      },
      {
        source: '/admin',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=31536000, stale-while-revalidate=86400' }],
      },
      // ── Quran fonts — immutable (1 year) ────────────────────────────────────
      {
        source: '/fonts/:font*.ttf',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // ── Large Quran JSON metadata ────────────────────────────────────────────
      {
        source: '/:file(quran.*\\.json|layout.*\\.json|Recitation.*\\.json)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      // ── Service worker — never cache ─────────────────────────────────────────
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
