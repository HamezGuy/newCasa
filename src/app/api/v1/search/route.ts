import { NextResponse } from "next/server";
import paragonApiClient, { IUserFilters } from "@/lib/ParagonApiClient";

export const dynamic = "force-dynamic";

// ----------------------------------------------------------------
// GET /api/v1/search => Main route handler for property searches
// ----------------------------------------------------------------
export async function GET(request: Request) {
  console.log("[GET /api/v1/search] => Endpoint triggered.");

  const { searchParams } = new URL(request.url);

  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const propertyId = searchParams.get("propertyId");
  const city = searchParams.get("city");
  const county = searchParams.get("county");
  
  // Address and radius parameters
  const address = searchParams.get("address");
  const radiusStr = searchParams.get("radius");
  const radius = radiusStr ? parseFloat(radiusStr) : 0; // Default to 0 for exact match

  // Parse user filters
  const minPriceStr = searchParams.get("minPrice");
  const maxPriceStr = searchParams.get("maxPrice");
  const minRoomsStr = searchParams.get("minRooms");
  const maxRoomsStr = searchParams.get("maxRooms");

  // Grab all propertyType query params
  const propertyTypeParams = searchParams.getAll("propertyType"); 
  // e.g. ?propertyType=Residential&propertyType=Land => ["Residential","Land"]

  // Convert them into { value: string }[] or undefined if empty
  const propertyTypes = propertyTypeParams.length
    ? propertyTypeParams.map((pt) => ({ value: pt }))
    : undefined;

  console.log("[GET /api/v1/search] => Query params:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
    address,
    radius,
    minPriceStr,
    maxPriceStr,
    minRoomsStr,
    maxRoomsStr,
    propertyTypes,
  });

  const userFilters: IUserFilters = {
    minPrice: minPriceStr ? parseInt(minPriceStr, 10) : undefined,
    maxPrice: maxPriceStr ? parseInt(maxPriceStr, 10) : undefined,
    minRooms: minRoomsStr ? parseInt(minRoomsStr, 10) : undefined,
    maxRooms: maxRoomsStr ? parseInt(maxRoomsStr, 10) : undefined,
    propertyTypes, // could be undefined => no property-type filter
  };

  try {
    let properties: any[] = [];

    // Decide which method to call based on the user's search param
    if (address) {
      // Address search with radius
      console.log(`[GET /api/v1/search] => Searching by address: ${address} with radius ${radius}`);
      const resp = await paragonApiClient.searchByAddress(address, radius, userFilters, true);
      properties = resp?.value || [];
      console.log(`[GET /api/v1/search] => Found ${properties.length} properties for address search`);
    } else if (zipCode) {
      // For multi-result queries => include media for complete data
      const resp = await paragonApiClient.searchByZipCode(zipCode, userFilters, true);
      properties = resp?.value || [];
    } else if (streetName) {
      // Another multi-result => include media
      const resp = await paragonApiClient.searchByStreetName(streetName, userFilters, true);
      properties = resp?.value || [];
    } else if (propertyId) {
      // Single property => include images
      const prop = await paragonApiClient.getPropertyById(propertyId, true);
      properties = prop ? [prop] : [];
    } else if (city) {
      const resp = await paragonApiClient.searchByCity(city, userFilters, true);
      properties = resp?.value || [];
    } else if (county) {
      const resp = await paragonApiClient.searchByCounty(county, userFilters, true);
      properties = resp?.value || [];
    } else {
      // If no location => get all properties
      console.log("[GET /api/v1/search] => no location => getAllPropertyWithMedia()");
      properties = await paragonApiClient.getAllPropertyWithMedia();
    }

    console.log(`[GET /api/v1/search] => found ${properties.length} properties`);
    return NextResponse.json(properties, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/v1/search] => CAUGHT ERROR =>", err);
    return NextResponse.json(
      {
        error: "Failed to fetch properties from API",
        details: process.env.NODE_ENV === 'development' ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}