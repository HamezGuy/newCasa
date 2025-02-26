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
  
  // Address parameter (no radius needed for exact address search)
  const address = searchParams.get("address");

  console.log("Query parameters received:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
    agentName,
    address
  });

  try {
    let properties: any[] = [];

    // (A) If agentName => fetch Tim's listings by agent
    if (agentName) {
      console.log(`Fetching properties for agentName = ${agentName}`);
      properties = await paragonApiClient.searchByListAgentName(agentName);
      console.log(`Fetched ${properties.length} for agentName=${agentName}`);
    }
    // (B) If address => fetch properties at the exact address
    else if (address) {
      console.log(`Fetching properties at address: ${address}`);
      const response = await paragonApiClient.searchByAddress(address, 0); // 0 radius for exact match
      properties = response?.value || [];
    }
    // (C) Else check zip/city/street/etc.
    else if (zipCode) {
      console.log(`Fetching properties for zipCode: ${zipCode}`);
      const response = await paragonApiClient.searchByZipCode(zipCode);
      properties = response?.value || [];
    } else if (streetName) {
      console.log(`Fetching properties for streetName: ${streetName}`);
      const response = await paragonApiClient.searchByStreetName(streetName);
      properties = response?.value || [];
    } else if (propertyId) {
      console.log(`Fetching property for propertyId: ${propertyId}`);
      const property = await paragonApiClient.getPropertyById(propertyId);
      properties = property ? [property] : [];
    } else if (city) {
      console.log(`Fetching properties for city: ${city}`);
      const response = await paragonApiClient.searchByCity(city);
      properties = response?.value || [];
    } else if (county) {
      console.log(`Fetching properties for county: ${county}`);
      const response = await paragonApiClient.searchByCounty(county);
      properties = response?.value || [];
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
      { error: "Failed to fetch properties from API" },
      { status: 500 }
    );
  }
}