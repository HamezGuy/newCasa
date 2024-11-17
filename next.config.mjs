/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        // protocol: 'https',
        hostname: 'cdnparap50.paragonrels.com',
        port: '',
        pathname: '/ParagonImages/Property/**',
      },
      {
        hostname: 'res.cloudinary.com',
      },
      {
        hostname: 'localhost',
      },
    ],
  },
  publicRuntimeConfig: {
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
    zipCodes: [53715, 53703], //note: if added here, must manually update code in data.ts
  },
};

export default nextConfig;
