// src/app/api/v1/listings/[id]/route.ts

import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      id?: string; // or just id: string if it’s guaranteed
    };
  }
) {
  console.log("Triggered: /api/v1/listings/[id]");

  const { id } = params;
  if (!id) {
    console.warn("Property ID is missing in request.");
    return NextResponse.json(
      { error: "Property ID is required" },
      { status: 400 }
    );
  }

  console.log(`Fetching property with ID: ${id}`);

  try {
    // Fetch property by ID
    const property = await paragonApiClient.getPropertyById(id);

    if (!property) {
      console.warn(`No property found with ID: ${id}`);
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    console.log(`Successfully fetched property with ID: ${id}`);
    return NextResponse.json(property, { status: 200 });
  } catch (error: any) {
    console.error(`Error fetching property with ID ${id}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}
