import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  try {
    // Fetches a specific property
    // TODO: Get the primary photo properly
    const property = await paragonApiClient.getPropertyById(id);

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
