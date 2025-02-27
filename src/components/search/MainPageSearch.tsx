"use client";

import Image from "next/image";
import { Title } from "@mantine/core";
import SearchInput from "./SearchInput";
import styles from "./HeroSearch.module.css";

import { useState, useEffect } from "react";
import axios from "axios";
import PropertyList from "@/components/paragon/PropertyList";

export default function MainPageSearch() {
  // State for Tim’s listings
  const [timListings, setTimListings] = useState<any[]>([]);
  const [loadingTim, setLoadingTim] = useState(false);

  // On mount, fetch Tim’s listings from /api/v1/listings?agentName=Tim Flores
  useEffect(() => {
    async function fetchTim() {
      try {
        setLoadingTim(true);
        const resp = await axios.get("/api/v1/listings", {
          params: { agentName: "Tim Flores" },
        });
        setTimListings(resp.data);
      } catch (err) {
        console.error("[fetchTim] => error:", err);
      } finally {
        setLoadingTim(false);
      }
    }
    fetchTim();
  }, []);

  return (
    <div className="w-full flex flex-col">
      {/* HERO SECTION */}
      <div
        className={`${styles.heroSearch} relative flex flex-col justify-center items-center text-white`}
        style={{
          minHeight: "450px",
          maxHeight: "700px",
          height: "60vh",
          overflow: "hidden",
        }}
      >
        <Image
          src="/img/home-hero3.jpg"
          alt="Cover"
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center" }}
          className="brightness-75"
        />

        <div className="relative z-10 p-4 flex flex-col items-center w-full">
          <Title
            order={2}
            className="drop-shadow text-center text-3xl sm:text-4xl mb-4 normal-case"
          >
            Find your next home
          </Title>

          {/* Search bar => mobile-friendly */}
          <div className="flex flex-col sm:flex-row items-stretch w-full max-w-xl gap-2">
            <SearchInput isRedirectEnabled={true} />
          </div>
        </div>
      </div>

      {/* TIM FLORES SECTION => Two-column layout */}
      <div className="max-w-screen-md mx-auto mt-10 mb-10 bg-white border rounded shadow p-6 text-gray-800">
        <Title order={3} className="text-2xl font-semibold mb-6">
          Meet Tim Flores
        </Title>

        <div className="flex flex-col md:flex-row gap-6">
          {/* LEFT COLUMN (narrower) */}
          <div className="md:w-2/5 w-full flex flex-col items-start">
            {/* Realtor Photo */}
            <Image
              src="/img/realtor-profile.jpg"
              alt="Tim Flores"
              width={200}
              height={200}
              className="object-cover rounded mb-4"
            />

            {/* Realtor Logo (optional) */}
            <Image
              src="/img/logo-realtor.png"
              alt="EXP Realty Logo"
              width={120}
              height={40}
              className="mb-4"
            />

            <p className="text-xl font-semibold mb-2">Tim Flores</p>

            {/* 
              CHANGED: Removed the short paragraph about 
              “I’m a real estate agent with EXP Realty...” 
              to prevent duplication.
            */}

            <div>
              <h4 className="font-bold mb-1">Contact Me</h4>
              <p className="mb-1">Direct: 608.579.3033</p>
              <p className="mb-1">Office: 866.848.6990</p>
              <p className="mb-1">tim.flores@flores.realty</p>
            </div>
          </div>

          {/* RIGHT COLUMN (wider) */}
          <div className="md:w-3/5 w-full">
            {/* Keep the main bio in the right column */}
            <p className="leading-relaxed mb-4">
              Tim Flores is a dedicated real estate professional providing
              home-buyers and sellers with attentive service. From understanding
              your needs to effectively marketing your home, Tim is here to guide
              you every step of the way.
            </p>
            <p className="leading-relaxed">
              Whether you’re buying, selling, or looking to invest, Tim
              brings a wealth of local knowledge and expertise to ensure you find
              exactly what you’re looking for in the ever-changing real estate
              market.
            </p>
          </div>
        </div>
      </div>

      {/* ABOUT OUR SERVICES */}
      <div className="max-w-screen-md mx-auto mb-10 bg-white border rounded shadow p-6 text-gray-800">
        <Title order={3} className="text-2xl font-semibold mb-4">
          About Our Services
        </Title>
        <p className="leading-relaxed mb-4">
          Welcome to our real-estate platform where you can easily search homes,
          explore communities, and connect with experienced agents. Our mission
          is to make your home-buying or selling process as seamless as possible.
        </p>
        <p className="leading-relaxed">
          Whether you’re looking for a cozy starter home or a luxury property,
          our dedicated team is here to guide you every step of the way. Let’s
          work together to find the home that fits your lifestyle.
        </p>
      </div>

      {/* TIM’S LISTINGS SECTION */}
      <div className="max-w-screen-lg mx-auto mb-16 bg-white border rounded shadow p-6 text-gray-800">
        <Title order={3} className="text-2xl font-semibold mb-4">
          Tim Flores&apos; Listings
        </Title>

        {loadingTim ? (
          <p>Loading Tim’s listings...</p>
        ) : timListings.length === 0 ? (
          <p className="text-gray-600">No listings found for Tim Flores.</p>
        ) : (
          <PropertyList properties={timListings} />
        )}
      </div>
    </div>
  );
}
