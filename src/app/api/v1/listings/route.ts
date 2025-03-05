import { NextRequest, NextResponse } from "next/server";
import paragonApiClient from "@/lib/ParagonApiClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log("Triggered: /api/v1/listings");

  // Parse params
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const propertyId = searchParams.get("propertyId");
  const city = searchParams.get("city");
  const county = searchParams.get("county");
  const agentName = searchParams.get("agentName");
  
  // Address parameter and radius
  const address = searchParams.get("address");
  const radiusStr = searchParams.get("radius");
  const radius = radiusStr ? parseFloat(radiusStr) : 0; // Default to 0 for exact match

  // CHANGED: Added allProperties param
  const allProperties = searchParams.get("allProperties") === "true";

  // Parse user filters
  const minPriceStr = searchParams.get("minPrice");
  const maxPriceStr = searchParams.get("maxPrice");
  const minRoomsStr = searchParams.get("minRooms");
  const maxRoomsStr = searchParams.get("maxRooms");
  
  // Get all propertyType values (can be multiple)
  const propertyTypeParams = searchParams.getAll("propertyType");
  const propertyTypes = propertyTypeParams.length 
    ? propertyTypeParams.map(pt => ({ value: pt })) 
    : undefined;

  // Build user filters object
  const userFilters = {
    minPrice: minPriceStr ? parseInt(minPriceStr, 10) : undefined,
    maxPrice: maxPriceStr ? parseInt(maxPriceStr, 10) : undefined,
    minRooms: minRoomsStr ? parseInt(minRoomsStr, 10) : undefined,
    maxRooms: maxRoomsStr ? parseInt(maxRoomsStr, 10) : undefined,
    propertyTypes,
  };

  console.log("Query parameters received:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
    agentName,
    address,
    radius,
    userFilters,
    // CHANGED: show allProperties
    allProperties
  });

  try {
    let properties: any[] = [];

    // CHANGED: If allProperties => call new method that returns up to 500
    if (allProperties) {
      console.log("Fetching ALL properties via getAllActivePendingWithCap500...");
      properties = await paragonApiClient.getAllActivePendingWithCap500(true);
    }

    // (A) If agentName => fetch agent's listings
    else if (agentName) {
      console.log(`Fetching properties for agentName = ${agentName}`);
      try {
        properties = await paragonApiClient.searchByListAgentName(agentName, userFilters, true);
        console.log(`Fetched ${properties.length} for agentName=${agentName}`);
      } catch (err) {
        console.error(`Error fetching by agent name ${agentName}:`, err);
        properties = [];
      }
    }
    // (B) If address => fetch properties at the exact address
    else if (address) {
      console.log(`Fetching properties at address: ${address} with radius ${radius} miles`);
      try {
        console.log("About to call paragonApiClient.searchByAddress");
        const response = await paragonApiClient.searchByAddress(address, radius, userFilters, true);
        console.log("searchByAddress response:", response);
        properties = response?.value || [];
        console.log(`Found ${properties.length} properties for address ${address}`);
      } catch (err) {
        console.error(`Error fetching by address ${address}:`, err);
        console.error("Error details:", err);
        properties = [];
      }
    }
    // (C) Else check zip/city/street/etc.
    else if (zipCode) {
      console.log(`Fetching properties for zipCode: ${zipCode}`);
      try {
        const response = await paragonApiClient.searchByZipCode(zipCode, userFilters, true);
        properties = response?.value || [];
      } catch (err) {
        console.error(`Error fetching by zipCode ${zipCode}:`, err);
        properties = [];
      }
    } else if (streetName) {
      console.log(`Fetching properties for streetName: ${streetName}`);
      try {
        const response = await paragonApiClient.searchByStreetName(streetName, userFilters, true);
        properties = response?.value || [];
      } catch (err) {
        console.error(`Error fetching by streetName ${streetName}:`, err);
        properties = [];
      }
    } else if (propertyId) {
      console.log(`Fetching property for propertyId: ${propertyId}`);
      try {
        const property = await paragonApiClient.getPropertyById(propertyId, true);
        properties = property ? [property] : [];
      } catch (err) {
        console.error(`Error fetching by propertyId ${propertyId}:`, err);
        properties = [];
      }
    } else if (city) {
      console.log(`Fetching properties for city: ${city}`);
      try {
        const response = await paragonApiClient.searchByCity(city, userFilters, true);
        properties = response?.value || [];
      } catch (err) {
        console.error(`Error fetching by city ${city}:`, err);
        properties = [];
      }
    } else if (county) {
      console.log(`Fetching properties for county: ${county}`);
      try {
        const response = await paragonApiClient.searchByCounty(county, userFilters, true);
        properties = response?.value || [];
      } catch (err) {
        console.error(`Error fetching by county ${county}:`, err);
        properties = [];
      }
    } else {
      console.log("No search param provided => returning empty array.");
      properties = [];
    }

    console.log(`Successfully fetched ${properties.length} properties.`);
    return NextResponse.json(properties, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/v1/listings:", {
      message: error.message,
      stack: error.stack,
      originalError: error,
    });
    
    return NextResponse.json(
      { 
        error: "Failed to fetch properties from API",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
