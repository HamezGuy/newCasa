/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default;

const nextConfig = {
  // Add this webpack config to fix fs module errors
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent client-side from trying to import server modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  
  // Increase timeout for static generation
  staticPageGenerationTimeout: 240, // 4 minutes
  
  // Set output to standalone
  output: 'standalone',
  
  // Fix experimental options
  experimental: {
    // Remove serverActions: true - it's now enabled by default
    workerThreads: true,
    cpus: 4,
    // Use proper options for Next.js 14
    // disableStaticGeneration was unrecognized
  },
  
  // Configure image optimization
  images: {
    remotePatterns: [
      {
        // Paragon Images
        protocol: "https",
        hostname: "cdnparap50.paragonrels.com",
        pathname: "/ParagonImages/Property/**",
      },
      {
        // Localhost (if you use it for testing)
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
      {
        // Cloudinary images
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dmluwytl0/image/upload/**",
      },
    ],
    // Optimize image loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_MOCK_DATA: process.env.NEXT_PUBLIC_MOCK_DATA,
  },
  
  // Runtime configuration
  publicRuntimeConfig: {
    realtor: {
      name: "Tim Flores",
      brand: "Flores Realty",
      profile: "I'm a real estate agent with EXP Realty, LLC ...", // etc
      agency: {
        name: "EXP Realty, LLC",
        address: "8383 Greenway Blvd Ste 600",
        city: "Middleton",
        state: "WI",
        zip: "53562",
      },
      phone: "6085793033",
      phoneAlt: "8668486990",
      email: "tim.flores@flores.realty",
    },
  },
  
  // Server runtime configuration
  serverRuntimeConfig: {
    zipCodes: [], 
    RESO_BASE_URL: process.env.RESO_BASE_URL,
    RESO_TOKEN_URL: process.env.RESO_TOKEN_URL,
    RESO_CLIENT_ID: process.env.RESO_CLIENT_ID,
    RESO_CLIENT_SECRET: process.env.RESO_CLIENT_SECRET,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  },
  
  // Performance optimizations
  swcMinify: true,
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
};

module.exports = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // PWA is disabled in development
  register: true,
  skipWaiting: true,
  // Add fallback for offline support
  fallbacks: {
    document: '/offline',  // path to your offline page
  },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/cdnparap50\.paragonrels\.com\/.*$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'property-images',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-images',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/maps\.googleapis\.com\/.*$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-maps',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
})(nextConfig);