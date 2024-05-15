import mockData from "@/../data/properties.json";
import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: Request | NextRequest) {
  try {
    const { searchParams } = new URL(request.url ?? "");
    const id = searchParams.get("id");

    if (!id) {
      // TODO: Return all realtor listings
      return NextResponse.json(mockData.value, { status: 200 });
    }

    const property = process.env.MOCK_DATA
      ? mockData.value.find((p) => p["ListingId"] == id)
      : await paragonApiClient.getPropertyById(id);

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
