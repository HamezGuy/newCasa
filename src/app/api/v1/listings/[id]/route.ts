// src/app/api/v1/listings/route.ts
import { NextRequest, NextResponse } from "next/server";
import paragonApiClient from "@/lib/ParagonApiClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log("Triggered: /api/v1/listings");

  try {
    // Parse params
    const { searchParams } = new URL(request.url);
    const zipCode = searchParams.get("zipCode");
    const streetName = searchParams.get("streetName");
    const propertyId = searchParams.get("propertyId");
    const city = searchParams.get("city");
    const county = searchParams.get("county");
    const agentName = searchParams.get("agentName");
    
    // NEW: address and radius parameters
    const address = searchParams.get("address");
    const radiusStr = searchParams.get("radius");
    const radius = radiusStr ? parseFloat(radiusStr) : 1; // Default to 1 mile

    console.log("Query parameters received:", {
      zipCode,
      streetName,
      propertyId,
      city,
      county,
      agentName,
      address,
      radius,
    });

    let properties: any[] = [];

    // (A) If agentName => fetch Tim's listings by agent
    if (agentName) {
      console.log(`Fetching properties for agentName = ${agentName}`);
      try {
        properties = await paragonApiClient.searchByListAgentName(agentName);
        console.log(`Fetched ${properties.length} for agentName=${agentName}`);
      } catch (err) {
        console.error(`Error fetching by agent name ${agentName}:`, err);
        properties = [];
      }
    }
    // (B) If address => fetch properties near the address
    else if (address) {
      console.log(`Fetching properties near address: ${address} with radius ${radius} miles`);
      try {
        const response = await paragonApiClient.searchByAddress(address, radius);
        properties = response?.value || [];
      } catch (err) {
        console.error(`Error fetching by address ${address}:`, err);
        properties = [];
      }
    }
    // (C) Else check zip/city/street/etc.
    else if (zipCode) {
      console.log(`Fetching properties for zipCode: ${zipCode}`);
      try {
        const response = await paragonApiClient.searchByZipCode(zipCode);
        properties = response?.value || [];
      } catch (err) {
        console.error(`Error fetching by zipCode ${zipCode}:`, err);
        properties = [];
      }
    } else if (streetName) {
      console.log(`Fetching properties for streetName: ${streetName}`);
      try {
        const response = await paragonApiClient.searchByStreetName(streetName);
        properties = response?.value || [];
      } catch (err) {
        console.error(`Error fetching by streetName ${streetName}:`, err);
        properties = [];
      }
    } else if (propertyId) {
      console.log(`Fetching property for propertyId: ${propertyId}`);
      try {
        const property = await paragonApiClient.getPropertyById(propertyId);
        properties = property ? [property] : [];
      } catch (err) {
        console.error(`Error fetching by propertyId ${propertyId}:`, err);
        properties = [];
      }
    } else if (city) {
      console.log(`Fetching properties for city: ${city}`);
      try {
        const response = await paragonApiClient.searchByCity(city);
        properties = response?.value || [];
      } catch (err) {
        console.error(`Error fetching by city ${city}:`, err);
        properties = [];
      }
    } else if (county) {
      console.log(`Fetching properties for county: ${county}`);
      try {
        const response = await paragonApiClient.searchByCounty(county);
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
    
    // Return a cleaner error response
    return NextResponse.json(
      { 
        error: "Failed to fetch properties from API",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}