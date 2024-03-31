import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";


// interface Request extends NextApiRequest {
//     query: { searchTerm?: string; }
// }

export async function GET(request: Request | NextRequest) {
    // TODO: Should be able to use request.query, but it's undefined...
    const url = new URL(request.url ?? "");
    const searchParams = url.searchParams;
    const searchTerm = searchParams.get("searchTerm");

    //const allProperty = await paragonApiClient.getAllProperty(10);
    const allProperty = await paragonApiClient.searchByZipCode(searchTerm ?? "");

    return NextResponse.json(allProperty, { status: 200 });
}