// app/ClientLoadScript.tsx
"use client";

import { LoadScript } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/constants"; // or ["places"]

export default function ClientLoadScript({
  children,
}: {
  children: React.ReactNode;
}) {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || "";

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={GOOGLE_MAPS_LIBRARIES}
    >
      {children}
    </LoadScript>
  );
}
