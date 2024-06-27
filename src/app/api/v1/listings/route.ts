import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Fetches all properties to build cache.
    // TODO: Get the primary photo properly or remove limit
    const properties = await paragonApiClient.getAllPropertyWithMedia(
      undefined,
      1
    );

    if (!properties || properties.length === 0) {
      return new NextResponse(`Did not find any properties`, {
        status: 404,
      });
    }

    return NextResponse.json(properties, { status: 200 });
  } catch (e: any) {
    console.log(`${e.message}`);
    return new NextResponse(`Failed to fetch properties from API`, {
      status: 500,
    });
  }
}
