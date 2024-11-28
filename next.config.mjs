/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Paragon Images
        protocol: 'https',
        hostname: 'cdnparap50.paragonrels.com',
        pathname: '/ParagonImages/Property/**',
      },
      {
        // Localhost (if you use it for testing)
        protocol: 'http',
        hostname: 'localhost',
        port: '3000', // Ensure port matches your local dev server
      },
      {
        // Cloudinary images
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dmluwytl0/image/upload/**', // Adjust the pathname if needed
      },
    ],
  },
  env: {
    // Load environment variables to be accessible in the app
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
  publicRuntimeConfig: {
    // Public data accessible on both client and server
    realtor: {
      name: 'Tim Flores',
      brand: 'Flores Realty',
      profile:
        "I’m a real estate agent with EXP Realty, LLC in Middleton, WI and the nearby area, providing home-buyers and sellers with professional, responsive and attentive real estate services. Want an agent who'll really listen to what you want in a home? Need an agent who knows how to effectively market your home so it sells? Give me a call! I'm eager to help and would love to talk to you.",
      agency: {
        name: 'EXP Realty, LLC',
        address: '8383 Greenway Blvd Ste 600',
        city: 'Middleton',
        state: 'WI',
        zip: '53562',
      },
      phone: '6085793033',
      phoneAlt: '8668486990',
      email: 'tim.flores@flores.realty',
    },
  },
  serverRuntimeConfig: {
    // Private data accessible only on the server
    zipCodes: [53715, 53703], // Update manually in data.ts if necessary
    RESO_BASE_URL: process.env.RESO_BASE_URL,
    RESO_TOKEN_URL: process.env.RESO_TOKEN_URL,
    RESO_CLIENT_ID: process.env.RESO_CLIENT_ID,
    RESO_CLIENT_SECRET: process.env.RESO_CLIENT_SECRET,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  },
};

export default nextConfig;
