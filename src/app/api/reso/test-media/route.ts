import { NextApiRequest } from "next";
import paragonApiClient from "@/lib/ParagonApiClient";
import { NextResponse } from "next/server";

export async function GET(request: NextApiRequest) {
    const allPropertyWithMedia = await paragonApiClient.getAllPropertyWithMedia(100);

    return NextResponse.json(allPropertyWithMedia, { status: 200 });
}