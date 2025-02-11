import { NextResponse } from "next/server";
import paragonApiClient from "../../../../lib/ParagonApiClient";

// NEW imports to support writing a file
import path from "path";
import { promises as fs } from "fs";

let propertiesData: any;
try {
  propertiesData = require("../../../../../data/properties.json");
} catch (error) {
  console.error("Error loading properties.json:", error);
  propertiesData = { value: [] };
}
const properties = propertiesData.value || propertiesData;

/**
 * This route handles various "test" query params. 
 * For example, /api/v1/Testing?test=compare_53713
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const test = searchParams.get("test");

  // ---------------------------------------
  // 1) RAW debug calls
  // ---------------------------------------
  if (test === "raw_53713") {
    try {
      const data = await paragonApiClient.debugRawZip53713();
      return NextResponse.json({ items: data, count: data.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "raw_53703") {
    try {
      const data = await paragonApiClient.debugRawZip53703();
      return NextResponse.json({ items: data, count: data.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "raw_madison") {
    try {
      const data = await paragonApiClient.debugRawCityMadison();
      return NextResponse.json({ items: data, count: data.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // ---------------------------------------
  // 2) Normal filter-based calls
  // ---------------------------------------
  if (test === "zip53713") {
    try {
      const resp = await paragonApiClient.searchByZipCode("53713");
      return NextResponse.json({ items: resp.value, count: resp.value.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "zip53703") {
    try {
      const resp = await paragonApiClient.searchByZipCode("53703");
      return NextResponse.json({ items: resp.value, count: resp.value.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "madison") {
    try {
      const resp = await paragonApiClient.searchByCity("Madison");
      return NextResponse.json({ items: resp.value, count: resp.value.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "street_moorland") {
    try {
      const resp = await paragonApiClient.searchByStreetName("Moorland Road");
      return NextResponse.json({ items: resp.value, count: resp.value.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // ---------------------------------------
  // 3) "raw first, then filter in memory"
  // ---------------------------------------
  if (test === "rawThenFilter_53713") {
    try {
      const data = await paragonApiClient.debugRawThenFilterZip53713();
      return NextResponse.json({ items: data, count: data.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "rawThenFilter_53703") {
    try {
      const data = await paragonApiClient.debugRawThenFilterZip53703();
      return NextResponse.json({ items: data, count: data.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "rawThenFilter_madison") {
    try {
      const data = await paragonApiClient.debugRawThenFilterCityMadison();
      return NextResponse.json({ items: data, count: data.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // ---------------------------------------
  // 4) Compare calls (with file writes)
  // ---------------------------------------
  if (test === "compare_53713") {
    try {
      const result = await paragonApiClient.compareFilterResultsZip53713();
      // Write differences to a file
      await saveDifferencesToFile("compare_zip53713-diff.json", result);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "compare_53703") {
    try {
      const result = await paragonApiClient.compareFilterResultsZip53703();
      // Write differences to a file
      await saveDifferencesToFile("compare_zip53703-diff.json", result);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "compare_madison") {
    try {
      const result = await paragonApiClient.compareFilterResultsCityMadison();
      // Write differences to a file
      await saveDifferencesToFile("compare_cityMadison-diff.json", result);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // ---------------------------------------
  // Fallback => local JSON (existing logic)
  // ---------------------------------------
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

  return NextResponse.json(filtered);
}

// ---------------------------------------------------
// Helper function to save difference data to a file
// ---------------------------------------------------
async function saveDifferencesToFile(filename: string, resultObj: any) {
  // Create logs/differences/ if it doesn't exist
  const dirPath = path.join(process.cwd(), "logs/differences");
  await fs.mkdir(dirPath, { recursive: true });

  const filePath = path.join(dirPath, filename);

  // We can keep it minimal or store entire object. 
  // For clarity, let's store missing arrays and counts:
  const minimal = {
    rawCount: resultObj.rawCount,
    filterCount: resultObj.filterCount,
    missingInRaw: resultObj.missingInRaw,
    missingInFilter: resultObj.missingInFilter,
    timestamp: new Date().toISOString(),
  };

  await fs.writeFile(filePath, JSON.stringify(minimal, null, 2), "utf8");
  console.log(`[saveDifferencesToFile] => wrote diff file => ${filePath}`);
}
