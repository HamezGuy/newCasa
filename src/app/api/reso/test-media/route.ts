import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: Request | NextRequest) {
  const allPropertyWithMedia = await paragonApiClient.getAllPropertyWithMedia(
    100
  );

  return NextResponse.json(allPropertyWithMedia, { status: 200 });
}
