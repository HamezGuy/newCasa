// File: src/app/about/page.tsx

import Image from "next/image";
import ClientMessageForm from "@/components/messages/ClientMessageForm";

// CHANGED: import getConfig to read from next.config.mjs publicRuntimeConfig
import getConfig from "next/config";

// CHANGED: We’ll extract the publicly available realtor info
const { publicRuntimeConfig } = getConfig();
const realtorConfig = publicRuntimeConfig?.realtor || {};

interface Realtor {
  name: string;
  bio: string;
  image: string;
  email: string;
  phone: string;
}

// CHANGED: Add an optional interface for the agency if you like
interface Agency {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export default function AboutPage(): JSX.Element {
  // CHANGED: We can also default to your config values
  const realtor: Realtor = {
    name: realtorConfig.name || "Tim Flores",
    // CHANGED: replaced weird entities with curly quotes
    bio: `I’m a real estate agent with LPT Realty in Cottage Grove, WI and the nearby area, providing home-buyers and sellers with professional, responsive and attentive real estate services. Want an agent who’ll really listen to what you want in a home? Need an agent who knows how to effectively market your home so it sells? Give me a call! I’m eager to help and would love to talk to you.`,
    image: realtorConfig.image || "/img/realtor-profile.jpg",
    email: realtorConfig.email || "tim.flores@flores.realty",
    phone: realtorConfig.phone || "608.579.3033",
  };

  // CHANGED: We'll gather the brand/agency data from config
  const { brand, agency, phoneAlt } = realtorConfig;
  const agencyData: Agency = agency || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center bg-local md:bg-fixed text-white"
        style={{ backgroundImage: "url('/img/home-hero3.jpg')" }}
      >
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="container mx-auto px-4 py-20 relative z-10 flex flex-col items-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-md mb-6">
            <Image
              src={realtor.image}
              alt={`${realtor.name} Profile`}
              width={160}
              height={160}
              className="object-cover"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            About {realtor.name}
          </h1>
          <p className="text-lg md:text-xl font-light">
            Your trusted realtor in the area
          </p>
        </div>
      </section>

      {/* Biography Section */}
      <section
        className="relative py-16 bg-local md:bg-fixed"
        style={{
          backgroundImage: "url('/img/home-hero3.jpg')",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-white opacity-90"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">About Me</h2>
            <p className="text-base md:text-lg leading-relaxed text-gray-700 mb-4">
              {realtor.bio}
            </p>
            <p className="text-base md:text-lg leading-relaxed text-gray-700">
              Whether you’re looking to buy, sell, or simply learn more about the
              market, I’m here to help you navigate the complex world of real estate
              with ease and confidence.
            </p>
          </div>
        </div>
      </section>

      {/* 
        CHANGED: New “Realtor Info” subsection 
        => phone, email, agency address, brand, etc.
      */}
      <section className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">
              Contact & Agency Info
            </h2>

            {/* Flex container for brand/logo & textual info */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* CHANGED: If you have a brand logo, show it */}
              {brand && (
                <div className="flex-shrink-0">
                  {/* 
                    Example: /img/flores-realty-logo.png 
                    or stored in config as brand.logo 
                  */}
                  <Image
                    src="/img/logo-realtor.png"
                    alt={`${brand} Logo`}
                    width={160}
                    height={80}
                    className="object-contain"
                  />
                </div>
              )}

              <div className="flex-1 text-gray-700 space-y-2">
                <p>
                  <strong>Realtor Email:</strong> {realtor.email}
                </p>
                <p>
                  <strong>Phone:</strong> {realtor.phone}
                  {phoneAlt && <span className="ml-2 text-sm text-gray-500">Alt: {phoneAlt}</span>}
                </p>
                {agencyData.name && (
                  <p>
                    <strong>Agency:</strong> {agencyData.name}
                  </p>
                )}
                {agencyData.address && (
                  <p>
                    <strong>Address:</strong> {agencyData.address},{" "}
                    {agencyData.city}, {agencyData.state} {agencyData.zip}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / Message Section */}
      <section className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-lg shadow-md">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-gray-800">
              Get in Touch
            </h2>
            <p className="mb-4 text-gray-600">
              Have questions or need more information? Fill out the form below and I’ll be in touch shortly.
            </p>
            <ClientMessageForm
              propertyId="about"
              realtorEmail={realtor.email}
              realtorPhoneNumber={realtor.phone}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
