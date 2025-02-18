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

  // Grab all propertyType query params
  const propertyTypeParams = searchParams.getAll("propertyType"); 
  // e.g. ?propertyType=Residential&propertyType=Land => ["Residential","Land"]

  // Convert them into { value: string }[] or undefined if empty
  const propertyTypes = propertyTypeParams.length
    ? propertyTypeParams.map((pt) => ({ value: pt }))
    : undefined;

  console.log("[GET /api/v1/listings] => Query params:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
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

    // Decide which method to call based on the user’s search param
    if (zipCode) {
      const resp = await paragonApiClient.searchByZipCode(zipCode, userFilters);
      properties = resp?.value || [];
    } else if (streetName) {
      const resp = await paragonApiClient.searchByStreetName(streetName, userFilters);
      properties = resp?.value || [];
    } else if (propertyId) {
      const prop = await paragonApiClient.getPropertyById(propertyId);
      properties = prop ? [prop] : [];
    } else if (city) {
      const resp = await paragonApiClient.searchByCity(city, userFilters);
      properties = resp?.value || [];
    } else if (county) {
      const resp = await paragonApiClient.searchByCounty(county, userFilters);
      properties = resp?.value || [];
    } else {
      // If no location => get all properties
      console.log("[GET /api/v1/listings] => no location => getAllPropertyWithMedia()");
      properties = await paragonApiClient.getAllPropertyWithMedia();
    }

    console.log(`[GET /api/v1/listings] => found ${properties.length} props`);
    return NextResponse.json(properties, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/v1/listings] => CAUGHT ERROR =>", err);
    return NextResponse.json(
      {
        error: "Failed to fetch properties from API",
        details: err.message || String(err),
      },
      { status: 500 }
    );
  }
}
