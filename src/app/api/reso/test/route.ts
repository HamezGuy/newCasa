import { NextApiRequest } from "next";
import paragonApiClient from "@/lib/ParagonApiClient";
import { NextResponse } from "next/server";

export async function GET(request: NextApiRequest) {
    const allProperty = await paragonApiClient.getAllProperty(10);

    return NextResponse.json(allProperty, { status: 200 });
}