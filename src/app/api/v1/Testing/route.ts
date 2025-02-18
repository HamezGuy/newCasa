import { NextResponse } from "next/server";
import paragonApiClient, { IUserFilters } from "../../../../lib/ParagonApiClient";

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
      await saveDifferencesToFile("compare_zip53713-diff.json", result);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "compare_53703") {
    try {
      const result = await paragonApiClient.compareFilterResultsZip53703();
      await saveDifferencesToFile("compare_zip53703-diff.json", result);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  if (test === "compare_madison") {
    try {
      const result = await paragonApiClient.compareFilterResultsCityMadison();
      await saveDifferencesToFile("compare_cityMadison-diff.json", result);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // ---------------------------------------
  // 5) NEW: By ID => ?test=byId&propertyId=xxx
  // ---------------------------------------
  if (test === "byId") {
    const propertyId = searchParams.get("propertyId");
    if (!propertyId) {
      return NextResponse.json({ error: "No propertyId provided" }, { status: 400 });
    }
    try {
      const item = await paragonApiClient.getPropertyById(propertyId);
      if (!item) {
        return NextResponse.json({ error: "No property found with that ID" }, { status: 404 });
      }
      return NextResponse.json({ item, count: 1 });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // ---------------------------------------
  // 6) NEW: test userFilters => ?test=userFilters
  // e.g. ?test=userFilters&minPrice=200000&maxPrice=600000&propertyType=Residential&propertyType=Land ...
  // We'll do a "filter-first" approach => call getAllPropertyWithMedia() and apply them at OData level
  // or do in-memory if you prefer. We'll do an OData approach for demonstration.
  // ---------------------------------------
  if (test === "userFilters") {
    // parse user filter fields
    const minPriceStr = searchParams.get("minPrice");
    const maxPriceStr = searchParams.get("maxPrice");
    const minRoomsStr = searchParams.get("minRooms");
    const maxRoomsStr = searchParams.get("maxRooms");
    const propertyTypes = searchParams.getAll("propertyType"); 
    // => array of strings

    const userFilters = {
      minPrice: minPriceStr ? parseInt(minPriceStr, 10) : undefined,
      maxPrice: maxPriceStr ? parseInt(maxPriceStr, 10) : undefined,
      minRooms: minRoomsStr ? parseInt(minRoomsStr, 10) : undefined,
      maxRooms: maxRoomsStr ? parseInt(maxRoomsStr, 10) : undefined,
      propertyTypes: propertyTypes.length
        ? propertyTypes.map((pt) => ({ value: pt }))
        : undefined,
    };

    console.log("[Testing] => userFilters =>", userFilters);

    try {
      // We'll just search "all" with userFilters => that means 'searchByCity("")' won't help,
      // let's do the getAllPropertyWithMedia approach and do the userFilter logic at OData
      // or we can do filter after. We'll do filter-BEFORE approach, but we have no city/zip => 
      // so let's build a dynamic call. We'll just do getAllPropertyWithMedia + in memory for demonstration.

      const allProps = await paragonApiClient.getAllPropertyWithMedia();
      // do a simple in-memory filter because we only have getAllPropertyWithMedia for "all" 
      // (If you had a direct "searchAll" w/ userFilters at OData, you could do that.)
      const filtered = applyInMemory(allProps, userFilters);
      return NextResponse.json({ items: filtered, count: filtered.length });
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

// ---------------------------------------------------
// NEW in-memory filter => same logic as your client
// ---------------------------------------------------
function applyInMemory(all: any[], filters: Partial<IUserFilters>) {
  let out = [...all];

  if (filters.minPrice && filters.minPrice > 0) {
    out = out.filter((p) => (p.ListPrice || 0) >= filters.minPrice!);
  }
  if (filters.maxPrice && filters.maxPrice > 0) {
    out = out.filter((p) => (p.ListPrice || 0) <= filters.maxPrice!);
  }
  if (filters.propertyTypes && filters.propertyTypes.length > 0) {
    const loweredSelected = filters.propertyTypes.map((t) => t.value.toLowerCase());
    out = out.filter((p) => {
      const rawType = p.PropertySubType || p.PropertyType || "";
      return loweredSelected.includes(rawType.toLowerCase());
    });
  }
  if (filters.minRooms && filters.minRooms > 0) {
    out = out.filter((p) => {
      const total = (p.BedroomsTotal || 0) + (p.BathroomsFull || 0) + (p.BathroomsHalf || 0);
      return total >= filters.minRooms!;
    });
  }
  if (filters.maxRooms && filters.maxRooms > 0) {
    out = out.filter((p) => {
      const total = (p.BedroomsTotal || 0) + (p.BathroomsFull || 0) + (p.BathroomsHalf || 0);
      return total <= filters.maxRooms!;
    });
  }

  return out;
}
