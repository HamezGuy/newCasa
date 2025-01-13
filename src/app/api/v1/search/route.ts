// src/app/api/v1/listings/route.ts

import { NextResponse } from "next/server";
import paragonApiClient from "@/lib/ParagonApiClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // ADDED LOGGING
  console.log("[GET /api/v1/listings] => Endpoint triggered.");

  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const propertyId = searchParams.get("propertyId");
  const city = searchParams.get("city");
  const county = searchParams.get("county");

  // ADDED LOGGING
  console.log("[GET /api/v1/listings] => Query params:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
  });

  try {
    let properties = [];

    // ADDED LOGGING
    console.log("[GET /api/v1/listings] => Starting property fetch logic...");

    if (zipCode) {
      // ADDED LOGGING
      console.log(`[GET /api/v1/listings] => searchByZipCode("${zipCode}")`);
      const response = await paragonApiClient.searchByZipCode(zipCode);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByZipCode found ${properties.length} props.`);
    } else if (streetName) {
      // ADDED LOGGING
      console.log(`[GET /api/v1/listings] => searchByStreetName("${streetName}")`);
      const response = await paragonApiClient.searchByStreetName(streetName);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByStreetName found ${properties.length} props.`);
    } else if (propertyId) {
      // ADDED LOGGING
      console.log(`[GET /api/v1/listings] => getPropertyById("${propertyId}")`);
      const property = await paragonApiClient.getPropertyById(propertyId);
      properties = property ? [property] : [];
      console.log(`[GET /api/v1/listings] => getPropertyById => found ${properties.length} prop(s).`);
    } else if (city) {
      // ADDED LOGGING
      console.log(`[GET /api/v1/listings] => searchByCity("${city}")`);
      const response = await paragonApiClient.searchByCity(city);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByCity found ${properties.length} props.`);
    } else if (county) {
      // ADDED LOGGING
      console.log(`[GET /api/v1/listings] => searchByCounty("${county}")`);
      const response = await paragonApiClient.searchByCounty(county);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByCounty found ${properties.length} props.`);
    } else {
      const response = await paragonApiClient.getAllProperty();
      properties = response ? Array.from(response.values()) : [];
    }

    // ADDED LOGGING
    console.log("[GET /api/v1/listings] => Returning JSON response now...");
    return NextResponse.json(properties, { status: 200 });

  } catch (error: any) {
    // ADDED LOGGING
    console.error("[GET /api/v1/listings] => CAUGHT ERROR =>", {
      name: error.name,
      message: error.message,
      stack: error.stack,

    });

    return NextResponse.json(
      { error: "Failed to fetch properties from API", details: error.message },
      { status: 500 }
    );
  }
}
