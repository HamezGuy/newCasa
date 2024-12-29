import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("Triggered: /api/v1/listings");

  // Parse params
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const propertyId = searchParams.get("propertyId");
  const city = searchParams.get("city");
  const county = searchParams.get("county");

  // ------------------------------------------------
  // OLD CODE => Search by param
  // ------------------------------------------------
  console.log("Query parameters received:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
  });

  try {
    let properties = [];

    if (zipCode) {
      console.log(`Fetching properties for zipCode: ${zipCode}`);
      const response = await paragonApiClient.searchByZipCode(zipCode);
      properties = response?.value || [];
      console.log(`Fetched ${properties.length} properties for zipCode: ${zipCode}`);
    } else if (streetName) {
      console.log(`Fetching properties for streetName: ${streetName}`);
      const response = await paragonApiClient.searchByStreetName(streetName);
      properties = response?.value || [];
      console.log(`Fetched ${properties.length} properties for streetName: ${streetName}`);
    } else if (propertyId) {
      console.log(`Fetching property for propertyId: ${propertyId}`);
      const property = await paragonApiClient.getPropertyById(propertyId);
      properties = property ? [property] : [];
      console.log(`Fetched property with propertyId: ${propertyId}`);
    } else if (city) {
      console.log(`Fetching properties for city: ${city}`);
      const response = await paragonApiClient.searchByCity(city);
      properties = response?.value || [];
      console.log(`Fetched ${properties.length} properties for city: ${city}`);
    } else if (county) {
      console.log(`Fetching properties for county: ${county}`);
      const response = await paragonApiClient.searchByCounty(county);
      properties = response?.value || [];
      console.log(`Fetched ${properties.length} properties for county: ${county}`);
    } else {
      console.log("No valid query parameters provided. Returning empty response.");
      return NextResponse.json([], { status: 200 });
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
