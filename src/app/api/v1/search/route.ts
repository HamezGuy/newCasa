import { NextResponse } from "next/server";
import paragonApiClient from "@/lib/ParagonApiClient";

export const dynamic = "force-dynamic";

// ----------------------------------------------------------------
// GET /api/v1/listings => Main route handler
// ----------------------------------------------------------------
export async function GET(request: Request) {
  console.log("[GET /api/v1/listings] => Endpoint triggered.");

  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const propertyId = searchParams.get("propertyId");
  const city = searchParams.get("city");
  const county = searchParams.get("county");

  console.log("[GET /api/v1/listings] => Query params:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
  });

  try {
    let properties: string | any[] = [];

    console.log("[GET /api/v1/listings] => Starting property fetch logic...");

    if (zipCode) {
      console.log(`[GET /api/v1/listings] => searchByZipCode("${zipCode}")`);
      const response = await paragonApiClient.searchByZipCode(zipCode);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByZipCode found ${properties.length} props.`);
    } else if (streetName) {
      console.log(`[GET /api/v1/listings] => searchByStreetName("${streetName}")`);
      const response = await paragonApiClient.searchByStreetName(streetName);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByStreetName found ${properties.length} props.`);
    } else if (propertyId) {
      console.log(`[GET /api/v1/listings] => getPropertyById("${propertyId}")`);
      const property = await paragonApiClient.getPropertyById(propertyId);
      properties = property ? [property] : [];
      console.log(`[GET /api/v1/listings] => getPropertyById => found ${properties.length} prop(s).`);
    } else if (city) {
      console.log(`[GET /api/v1/listings] => searchByCity("${city}")`);
      const response = await paragonApiClient.searchByCity(city);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByCity found ${properties.length} props.`);
    } else if (county) {
      console.log(`[GET /api/v1/listings] => searchByCounty("${county}")`);
      const response = await paragonApiClient.searchByCounty(county);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByCounty found ${properties.length} props.`);
    } else {
      // If user didn't specify anything, we might return an empty array or default all
      properties = [];
    }

    console.log("[GET /api/v1/listings] => Returning JSON response now...");
    return NextResponse.json(properties, { status: 200 });
  } catch (error: any) {
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
