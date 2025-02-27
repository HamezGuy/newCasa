import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

const fetchWithRetry = async (url: string, options: any, retries: number = 3): Promise<any> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}: Fetching data from ${url}`);
      const response = await axios.get(url, options);
      if (response?.data) return response;
    } catch (error: any) {
      console.warn(`Retry ${attempt + 1} failed: ${error.message}`);
      if (attempt === retries - 1) throw error;
    }
  }
  throw new Error("Failed to fetch data after retries.");
};

export async function GET(req: NextRequest) {
  // Use the server-side API key, not the public one
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  if (!GOOGLE_MAPS_API_KEY) {
    console.error("Google Maps API key is missing.");
    return NextResponse.json(
      { error: "Google Maps API key is missing." },
      { status: 500 }
    );
  }

  const { searchParams } = req.nextUrl;
  const input = searchParams.get("input");
  const types = searchParams.get("types") || "(regions)";

  if (!input) {
    console.warn("Input query is missing.");
    return NextResponse.json({ error: "Input query is required." }, { status: 400 });
  }

  try {
    // Check if this is an address search
    const isAddressSearch = types === "address";
    
    const params: any = {
      input,
      key: GOOGLE_MAPS_API_KEY,
      components: "country:US", // Limit to US results
    };
    
    // Only use types for non-address searches
    if (!isAddressSearch) {
      params.types = types;
    }
    
    const options = {
      params,
      timeout: 5000,
    };

    console.log(`Fetching autocomplete suggestions for input: ${input}, isAddressSearch: ${isAddressSearch}`);
    const response = await fetchWithRetry(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      options
    );

    if (response?.status === 200 && response.data?.status === "OK") {
      console.log(`Successfully fetched suggestions for input: ${input}`);
      return NextResponse.json(response.data, { status: 200 });
    } else {
      console.warn(`Failed to fetch suggestions: ${response?.data?.error_message}`);
      return NextResponse.json(
        {
          error: response?.data?.error_message || "Failed to fetch autocomplete data.",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in Autocomplete API:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch autocomplete suggestions." },
      { status: 500 }
    );
  }
}