import { NextApiRequest } from "next";
import ParagonApiClient from "@/lib/ParagonApiClient";
import { NextResponse } from "next/server";

const RESO_BASE_URL = process.env.RESO_BASE_URL ?? "";
const RESO_TOKEN_URL = process.env.RESO_TOKEN_URL ?? "";
const RESO_CLIENT_ID = process.env.RESO_CLIENT_ID ?? "";
const RESO_CLIENT_SECRET = process.env.RESO_CLIENT_SECRET ?? "";

// interface Request extends NextApiRequest {
//     query: { searchTerm?: string; }
// }

export async function GET(request: NextApiRequest) {
    // TODO: Should be able to use request.query, but it's undefined...
    const url = new URL(request.url ?? "");
    const searchParams = url.searchParams;
    const searchTerm = searchParams.get("searchTerm");

    const paragonApiClient = await ParagonApiClient.forClientSecret(RESO_BASE_URL, RESO_TOKEN_URL, RESO_CLIENT_ID, RESO_CLIENT_SECRET);
    //const allProperty = await paragonApiClient.getAllProperty();
    const allProperty = await paragonApiClient.searchByZipCode(searchTerm ?? "");

    return NextResponse.json(allProperty, { status: 200 });
}