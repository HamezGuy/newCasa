"use client";

import Image from "next/image";
import { Title } from "@mantine/core";
import SearchInput from "./SearchInput";
import styles from "./HeroSearch.module.css";

// CHANGED: import React hooks & axios to fetch Tim’s listings
import { useState, useEffect } from "react";
import axios from "axios";
import PropertyList from "@/components/paragon/PropertyList";

export default function MainPageSearch() {
  // CHANGED: State for Tim’s listings
  const [timListings, setTimListings] = useState<any[]>([]);
  const [loadingTim, setLoadingTim] = useState(false);

  // CHANGED: On mount, fetch Tim’s listings from /api/v1/listings?agentName=Tim Flores
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
      {/* 
        HERO SECTION 
        CHANGED: We remove the fixed height of 600 
        and replace it with a responsive height 
        so image doesn't stretch too much.
      */}
      <div
        className={`${styles.heroSearch} relative flex flex-col justify-center items-center text-white`}
        style={{
          minHeight: "450px",
          maxHeight: "700px",
          height: "60vh", // you can adjust as needed
          overflow: "hidden",
        }}
      >
        <Image
          src="/img/home-hero3.jpg"
          alt="Cover"
          fill
          priority
          // CHANGED: ensure no “stretch”; we use cover + centered
          style={{ objectFit: "cover", objectPosition: "center" }}
          className="brightness-75"
        />

        <div className="relative z-10 p-4 flex flex-col items-center">
          <Title order={2} className="drop-shadow text-center text-3xl sm:text-4xl mb-4 normal-case">
            Find your next home
          </Title>

          <div className="flex justify-center w-full max-w-xl">
            {/* Renders search input with redirect enabled */}
            <SearchInput isRedirectEnabled={true} />
          </div>
        </div>
      </div>

      {/* 
        ABOUT SECTION 
        CHANGED: an about block with slight borders/shadow, 
        professional styling, centered text, etc.
      */}
      <div className="max-w-screen-md mx-auto mt-10 mb-10 bg-white border rounded shadow p-6 text-gray-800">
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

      {/* 
        TIM’S LISTINGS SECTION
        CHANGED: we show Tim Flores’s listings in a
        similar style block with a heading.
      */}
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
