// D:\NewCasa\newcasa\src\app\api\v1\Testing\route.ts
import { NextResponse } from "next/server";
import paragonApiClient from "../../../../lib/ParagonApiClient"; // <== reference your original paragonApiClient, which has the debug methods

let propertiesData: any;
try {
  propertiesData = require("../../../../../data/properties.json");
} catch (error) {
  console.error("Error loading properties.json:", error);
  propertiesData = { value: [] };
}

const properties = propertiesData.value || propertiesData;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const test = searchParams.get("test");

  if (test === "zip53713") {
    try {
      // Call your newly inserted debug method in paragonApiClient
      const data = await paragonApiClient.debugRawZip53713();
      return NextResponse.json({ items: data, count: data.length }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  if (test === "zip53703") {
    try {
      const data = await paragonApiClient.debugRawZip53703();
      return NextResponse.json({ items: data, count: data.length }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  if (test === "madison") {
    try {
      const data = await paragonApiClient.debugRawCityMadison();
      return NextResponse.json({ items: data, count: data.length }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // If no "test" param matched, revert to your local JSON approach:
  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const city = searchParams.get("city");
  const county = searchParams.get("county");

  let filtered = properties;

  if (zipCode) {
    filtered = filtered.filter((p: any) => p.PostalCode === zipCode);
  }
  if (streetName) {
    filtered = filtered.filter((p: any) =>
      p.StreetName?.toLowerCase().includes(streetName.toLowerCase())
    );
  }
  if (city) {
    filtered = filtered.filter((p: any) =>
      p.City?.toLowerCase().includes(city.toLowerCase())
    );
  }
  if (county) {
    filtered = filtered.filter((p: any) =>
      p.CountyOrParish?.toLowerCase().includes(county.toLowerCase())
    );
  }

  return NextResponse.json(filtered, { status: 200 });
}
