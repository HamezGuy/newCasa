"use client";

import { LoadScript } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/constants"; 
import React, { useEffect, useState } from "react";

// Keep track if we already loaded the script once
let scriptAlreadyLoaded = false;

export default function GoogleMapsClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || "";

  // Start off loading only if we haven't loaded it before
  const [shouldLoad, setShouldLoad] = useState(!scriptAlreadyLoaded);

  useEffect(() => {
    // If script was not loaded before, mark it. Otherwise skip re-load
    if (!scriptAlreadyLoaded) {
      scriptAlreadyLoaded = true;
    } else {
      setShouldLoad(false);
    }
  }, []);

  if (!shouldLoad) {
    // The script is presumably already loaded, so just render children
    return <>{children}</>;
  }

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={GOOGLE_MAPS_LIBRARIES}
    >
      {children}
    </LoadScript>
  );
}
