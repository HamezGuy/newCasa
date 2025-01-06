// src/app/api/v1/listings/route.ts

import { NextResponse } from "next/server";
import paragonApiClient from "@/lib/ParagonApiClient";

export async function GET(request: Request) {
  console.log("Triggered: /api/v1/listings");

  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const propertyId = searchParams.get("propertyId");
  const city = searchParams.get("city");
  const county = searchParams.get("county");

  console.log("Query parameters received:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
  });

  try {
    let properties = [];

    // Various conditionals:
    if (zipCode) {
      const response = await paragonApiClient.searchByZipCode(zipCode);
      properties = response?.value || [];
    } else if (streetName) {
      const response = await paragonApiClient.searchByStreetName(streetName);
      properties = response?.value || [];
    } else if (propertyId) {
      const property = await paragonApiClient.getPropertyById(propertyId);
      properties = property ? [property] : [];
    } else if (city) {
      const response = await paragonApiClient.searchByCity(city);
      properties = response?.value || [];
    } else if (county) {
      const response = await paragonApiClient.searchByCounty(county);
      properties = response?.value || [];
    } else {
      properties = new Array(1);
    }

    console.log(`Fetched ${properties.length} properties (raw).`);

    // -----------------------------------------
    // TEMPORARY CAP AT 100 FOR TESTING PURPOSES
    // -----------------------------------------
    properties = properties.slice(0, 100);
    console.log(
      `Capped the results to 100 for testing. Final length = ${properties.length}.`
    );
    // (Remove the .slice(...) call when you no longer need the 100 cap)

    return NextResponse.json(properties, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/v1/listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties from API" },
      { status: 500 }
    );
  }
}
