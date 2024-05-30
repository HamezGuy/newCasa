import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Fetches all properties to build cache.
    // Specific property queries are performed on the client (?)
    // TODO: Remove limit or add proper way to get the primary photo
    const properties = await paragonApiClient.getAllPropertyWithMedia(
      undefined,
      1
    );

    if (!properties || properties.length === 0) {
      return new NextResponse(`Could not find property`, {
        status: 404,
      });
    }

    return NextResponse.json(properties, { status: 200 });
  } catch (e: any) {
    console.log(`${e.message}`);
    return new NextResponse(`Failed to fetch listings`, {
      status: 500,
    });
  }
}
