import propertiesJson from "@/../data/properties.json";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: Request | NextRequest) {
  try {
    const { searchParams } = new URL(request.url ?? "");
    const id = searchParams.get("id");

    //TODO: Do with API call, instead of from proerties.json

    if (!id) {
      // Returns all listings
      return NextResponse.json(propertiesJson.value, { status: 200 });
    }

    const property = propertiesJson.value.find((p) => p["ListingId"] == id);

    if (!property) {
      return new NextResponse(`Could not find property`, {
        status: 404,
      });
    }

    return NextResponse.json(property, { status: 200 });
  } catch (e: any) {
    console.log(`${e.message}`);
    return new NextResponse(`Failed to fetch listings`, {
      status: 500,
    });
  }
}
