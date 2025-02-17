import { NextResponse } from "next/server";
import paragonApiClient, { IUserFilters } from "@/lib/ParagonApiClient";

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

  // Parse user filters
  const minPriceStr = searchParams.get("minPrice");
  const maxPriceStr = searchParams.get("maxPrice");
  const minRoomsStr = searchParams.get("minRooms");
  const maxRoomsStr = searchParams.get("maxRooms");
  const propertyTypes = searchParams.getAll("propertyType"); 
  // e.g. ?propertyType=house&propertyType=condo => ["house","condo"]

  console.log("[GET /api/v1/listings] => Query params:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
    minPrice: minPriceStr,
    maxPrice: maxPriceStr,
    minRooms: minRoomsStr,
    maxRooms: maxRoomsStr,
    propertyTypes,
  });

  // Build userFilters object => optional to pass to ParagonApiClient
  const userFilters: IUserFilters = {
    minPrice: minPriceStr ? parseInt(minPriceStr, 10) : undefined,
    maxPrice: maxPriceStr ? parseInt(maxPriceStr, 10) : undefined,
    minRooms: minRoomsStr ? parseInt(minRoomsStr, 10) : undefined,
    maxRooms: maxRoomsStr ? parseInt(maxRoomsStr, 10) : undefined,
    propertyTypes: propertyTypes.length ? propertyTypes : undefined,
  };

  try {
    let properties: string | any[] = [];

    console.log("[GET /api/v1/listings] => Starting property fetch logic...");

    // For demonstration, we still call your existing methods:
    // (We've simply added userFilters as a second argument if the method supports it.)
    if (zipCode) {
      console.log(`[GET /api/v1/listings] => searchByZipCode("${zipCode}")`);
      // pass userFilters => searchByZipCode(zip, userFilters?)
      const response = await paragonApiClient.searchByZipCode(zipCode, userFilters);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByZipCode found ${properties.length} props.`);
    } else if (streetName) {
      console.log(`[GET /api/v1/listings] => searchByStreetName("${streetName}")`);
      const response = await paragonApiClient.searchByStreetName(streetName, userFilters);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByStreetName found ${properties.length} props.`);
    } else if (propertyId) {
      console.log(`[GET /api/v1/listings] => getPropertyById("${propertyId}")`);
      // getPropertyById doesn't need userFilters, so we skip
      const property = await paragonApiClient.getPropertyById(propertyId);
      properties = property ? [property] : [];
      console.log(`[GET /api/v1/listings] => getPropertyById => found ${properties.length} prop(s).`);
    } else if (city) {
      console.log(`[GET /api/v1/listings] => searchByCity("${city}")`);
      const response = await paragonApiClient.searchByCity(city, userFilters);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => searchByCity found ${properties.length} props.`);
    } else if (county) {
      console.log(`[GET /api/v1/listings] => searchByCounty("${county}")`);
      const response = await paragonApiClient.searchByCounty(county, userFilters);
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
