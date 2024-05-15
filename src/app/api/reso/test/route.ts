import mockData from "@/../data/properties-53715.json";
import paragonApiClient from "@/lib/ParagonApiClient";
import { NextRequest, NextResponse } from "next/server";

// interface Request extends NextApiRequest {
//     query: { searchTerm?: string; }
// }

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const searchTerm = searchParams.get("searchTerm");

  //const allProperty = await paragonApiClient.getAllProperty(10);

  const foundProperties = process.env.MOCK_DATA
    ? mockData
    : await paragonApiClient.searchByZipCode(searchTerm ?? "");

  // console.log("foundProperties: ", foundProperties.value.length);
  // console.log("property[0] Media: ", foundProperties.value[0].Media);

  return NextResponse.json(foundProperties, { status: 200 });
}
