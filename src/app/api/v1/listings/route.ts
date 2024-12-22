import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("Triggered: /api/v1/listings");

  try {
    // Fetch all properties
    const properties = await paragonApiClient.getAllPropertyWithMedia(undefined, 1);

    if (!properties || properties.length === 0) {
      console.warn("No properties found.");
      return NextResponse.json({ error: "No properties found" }, { status: 404 });
    }

    console.log("Successfully fetched properties:", properties.length);
    return NextResponse.json(properties, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/v1/listings:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch properties from API" },
      { status: 500 }
    );
  }
}
