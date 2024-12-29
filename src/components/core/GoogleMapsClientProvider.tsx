'use client';

import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/constants'; 
import React, { useEffect, useState } from 'react';

// NEW: keep track if we already loaded the Google script
let scriptAlreadyLoaded = false;

export default function GoogleMapsClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || '';

  // We start `shouldLoad` as TRUE only if script was never loaded
  const [shouldLoad, setShouldLoad] = useState(!scriptAlreadyLoaded);

  useEffect(() => {
    // If script wasn't loaded before, mark it. Otherwise, skip re-load
    if (!scriptAlreadyLoaded) {
      scriptAlreadyLoaded = true;
    } else {
      setShouldLoad(false);
    }
  }, []);

  if (!shouldLoad) {
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
