import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  console.log("Geocode API endpoint hit.");

  // Use the server-side API key, not the public one
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

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

  console.log(`Address received: ${address}`);

  try {
    // Call Google Maps Geocoding API with more specific parameters
    const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY,
        // Add these parameters to improve exact address matching
        components: "country:US", // Limit to US addresses
      },
    });

    console.log("Google API response status:", response.data.status);
    
    // Log the first result for debugging
    if (response.data.results && response.data.results.length > 0) {
      console.log("First result types:", response.data.results[0].types);
      console.log("First result formatted address:", response.data.results[0].formatted_address);
      
      // Also log address components to help with debugging
      if (response.data.results[0].address_components) {
        console.log("Address components:", 
          JSON.stringify(response.data.results[0].address_components.map((c: any) => ({
            long_name: c.long_name,
            short_name: c.short_name,
            types: c.types
          }))));
      }
    }

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