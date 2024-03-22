import { NextApiRequest } from "next";
import ParagonApiClient from "@/lib/ParagonApiClient";
import { NextResponse } from "next/server";

const RESO_BASE_URL = process.env.RESO_BASE_URL ?? "";
const RESO_TOKEN_URL = process.env.RESO_TOKEN_URL ?? "";
const RESO_CLIENT_ID = process.env.RESO_CLIENT_ID ?? "";
const RESO_CLIENT_SECRET = process.env.RESO_CLIENT_SECRET ?? "";

export async function GET(request: NextApiRequest) {
    const paragonApiClient = await ParagonApiClient.forClientSecret(RESO_BASE_URL, RESO_TOKEN_URL, RESO_CLIENT_ID, RESO_CLIENT_SECRET);
    const allProperty = await paragonApiClient.getAllProperty();

    return NextResponse.json(allProperty, { status: 200 });
}