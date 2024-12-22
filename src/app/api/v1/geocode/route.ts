import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  console.log("Geocode API endpoint hit."); // Updated log

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;

  if (!GOOGLE_MAPS_API_KEY) {
    console.error("Google Maps API key is missing.");
    return NextResponse.json({ error: "Google Maps API key is missing." }, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address");

  if (!address) {
    console.warn("Address parameter is missing.");
    return NextResponse.json({ error: "Address query is required." }, { status: 400 });
  }

  console.log(`Address received: ${address}`); // Debug log

  try {
    const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    console.log("Google API response status:", response.data.status); // Debug log

    if (response.data.status === "OK") {
      return NextResponse.json(response.data, { status: 200 });
    } else {
      console.error(
        "Google API returned an error:",
        response.data.error_message || "Unknown error."
      );
      return NextResponse.json(
        { error: response.data.error_message || "Failed to fetch geocoding data." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error calling Google Maps API:", error.message);
    return NextResponse.json({ error: "Failed to fetch geocoding data." }, { status: 500 });
  }
}
