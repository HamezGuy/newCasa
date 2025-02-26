import { NextResponse } from "next/server";
import paragonApiClient, { IUserFilters } from "../../../../lib/ParagonApiClient";

// NEW imports for Firebase Admin + concurrency
import { firestoreAdmin } from "../../../../lib/firebaseAdmin";
import pMap from "p-map";

// Import the ParagonPropertyWithMedia type (so we can specify 'Media' exists)
import type { ParagonPropertyWithMedia } from "@/types/IParagonMedia";

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
  // 5) By ID => ?test=byId&propertyId=xxx
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
  // 5b) By Address => ?test=byAddress&address=xxx&radius=y
  // ---------------------------------------
  if (test === "byAddress") {
    const address = searchParams.get("address");
    const radiusStr = searchParams.get("radius");
    const radius = radiusStr ? parseFloat(radiusStr) : 1; // Default to 1 mile
    
    if (!address) {
      return NextResponse.json({ error: "No address provided" }, { status: 400 });
    }
    
    try {
      const resp = await paragonApiClient.searchByAddress(address, radius);
      return NextResponse.json({ 
        items: resp.value, 
        count: resp.value.length,
        address,
        radius
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // ---------------------------------------
  // 6) test userFilters => ?test=userFilters
  // ---------------------------------------
  if (test === "userFilters") {
    const minPriceStr = searchParams.get("minPrice");
    const maxPriceStr = searchParams.get("maxPrice");
    const minRoomsStr = searchParams.get("minRooms");
    const maxRoomsStr = searchParams.get("maxRooms");
    const propertyTypes = searchParams.getAll("propertyType");

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
      const allProps = await paragonApiClient.getAllPropertyWithMedia();
      const filtered = applyInMemory(allProps, userFilters);
      return NextResponse.json({ items: filtered, count: filtered.length });
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // ---------------------------------------
  // 7) STORE TO FIREBASE => ?test=storeFirebase&city=... or &zip=...
  //    - "newcasaproperties" for the property doc
  //    - "newcasapropertiesMedias" for each Media doc
  // ---------------------------------------
  if (test === "storeFirebase") {
    const city = searchParams.get("city")?.trim();
    const zip = searchParams.get("zip")?.trim();

    if (!city && !zip) {
      return NextResponse.json(
        { error: "Please provide either 'city' or 'zip' for storeFirebase." },
        { status: 400 }
      );
    }

    try {
      // 1) Fetch from Paragon => Active/Pending w/ Media
      //    We explicitly type as ParagonPropertyWithMedia[]
      let propertiesToStore: ParagonPropertyWithMedia[] = [];

      if (city) {
        const resp = await paragonApiClient.searchByCity(city, undefined, true);
        propertiesToStore = resp.value;
      } else {
        const resp = await paragonApiClient.searchByZipCode(zip!, undefined, true);
        propertiesToStore = resp.value;
      }

      // 2) Write them to Firestore
      await pMap(
        propertiesToStore,
        async (prop) => {
          if (!prop.ListingKey) return;

          // (A) Store the property doc
          const propRef = firestoreAdmin
            .collection("newcasaproperties")
            .doc(prop.ListingKey);

          // Remove the .Media array if you don't want it in the property doc
          const { Media, ...rest } = prop;
          await propRef.set(rest, { merge: true });

          // (B) If there's a Media array, store each item in "newcasapropertiesMedias"
          if (Media && Media.length) {
            await pMap(
              Media,
              async (m) => {
                // docId => `${ListingKey}_${m.MediaKey}`
                const docId = `${prop.ListingKey}_${m.MediaKey}`;
                const mediaRef = firestoreAdmin
                  .collection("newcasapropertiesMedias")
                  .doc(docId);

                // Include listingKey so we can filter by property later
                await mediaRef.set(
                  {
                    listingKey: prop.ListingKey,
                    ...m,
                  },
                  { merge: true }
                );
              },
              { concurrency: 10 }
            );
          }
        },
        { concurrency: 5 }
      );

      return NextResponse.json({
        success: true,
        message: `Stored ${propertiesToStore.length} properties + all media in Firestore.`,
      });
    } catch (err: any) {
      console.error("[storeFirebase] => error =>", err);
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }
  
  // ---------------------------------------
  // 8) Store Address Search to Firebase
  // ---------------------------------------
  if (test === "storeAddressSearch") {
    const address = searchParams.get("address")?.trim();
    const radiusStr = searchParams.get("radius");
    const radius = radiusStr ? parseFloat(radiusStr) : 1;
    
    if (!address) {
      return NextResponse.json(
        { error: "Please provide an address for storeAddressSearch." },
        { status: 400 }
      );
    }
    
    try {
      // 1) Fetch properties near the address
      const resp = await paragonApiClient.searchByAddress(address, radius, undefined, true);
      const propertiesToStore = resp.value;
      
      // 2) Write them to Firestore with the address search info
      await pMap(
        propertiesToStore,
        async (prop) => {
          if (!prop.ListingKey) return;

          // (A) Store the property doc
          const propRef = firestoreAdmin
            .collection("newcasaproperties")
            .doc(prop.ListingKey);

          // Add search metadata
          const searchMetadata = {
            searchedAddress: address,
            searchRadius: radius,
            distanceFromSearch: (prop as any).distanceFromSearch || null,
            searchTimestamp: new Date().toISOString()
          };
          
          // Remove the .Media array if you don't want it in the property doc
          const { Media, ...rest } = prop;
          await propRef.set({
            ...rest,
            searchMetadata
          }, { merge: true });

          // (B) If there's a Media array, store each item in "newcasapropertiesMedias"
          if (Media && Media.length) {
            await pMap(
              Media,
              async (m) => {
                // docId => `${ListingKey}_${m.MediaKey}`
                const docId = `${prop.ListingKey}_${m.MediaKey}`;
                const mediaRef = firestoreAdmin
                  .collection("newcasapropertiesMedias")
                  .doc(docId);

                // Include listingKey so we can filter by property later
                await mediaRef.set(
                  {
                    listingKey: prop.ListingKey,
                    ...m,
                  },
                  { merge: true }
                );
              },
              { concurrency: 10 }
            );
          }
        },
        { concurrency: 5 }
      );
      
      // 3) Also store the search itself in a separate collection
      const searchDocRef = firestoreAdmin
        .collection("addressSearches")
        .doc(`${new Date().getTime()}`);
        
      await searchDocRef.set({
        address,
        radius,
        timestamp: new Date().toISOString(),
        resultCount: propertiesToStore.length,
        propertyIds: propertiesToStore.map(p => p.ListingKey)
      });

      return NextResponse.json({
        success: true,
        message: `Stored ${propertiesToStore.length} properties from address search in Firestore.`,
        searchId: searchDocRef.id
      });
    } catch (err: any) {
      console.error("[storeAddressSearch] => error =>", err);
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  // ---------------------------------------
  // Fallback => local JSON if no test param
  // ---------------------------------------
  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const city = searchParams.get("city");
  const county = searchParams.get("county");
  const address = searchParams.get("address");
  const radiusStr = searchParams.get("radius");

  // If address is provided, use the searchByAddress method
  if (address) {
    const radius = radiusStr ? parseFloat(radiusStr) : 1;
    try {
      const resp = await paragonApiClient.searchByAddress(address, radius);
      return NextResponse.json(resp.value);
    } catch (err: any) {
      return NextResponse.json({ error: err.toString() }, { status: 500 });
    }
  }

  let filteredData = properties;
  if (zipCode) {
    filteredData = filteredData.filter((p: any) => p.PostalCode === zipCode);
  }
  if (streetName) {
    filteredData = filteredData.filter((p: any) =>
      p.StreetName?.toLowerCase().includes(streetName.toLowerCase())
    );
  }
  if (city) {
    filteredData = filteredData.filter((p: any) =>
      p.City?.toLowerCase().includes(city.toLowerCase())
    );
  }
  if (county) {
    filteredData = filteredData.filter((p: any) =>
      p.CountyOrParish?.toLowerCase().includes(county.toLowerCase())
    );
  }

  return NextResponse.json(filteredData);
}

// ---------------------------------------------------
// Helper function to save difference data to a file
// ---------------------------------------------------
async function saveDifferencesToFile(filename: string, resultObj: any) {
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
// In-memory filter => same logic as your client
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
      const total =
        (p.BedroomsTotal || 0) + (p.BathroomsFull || 0) + (p.BathroomsHalf || 0);
      return total >= filters.minRooms!;
    });
  }
  if (filters.maxRooms && filters.maxRooms > 0) {
    out = out.filter((p) => {
      const total =
        (p.BedroomsTotal || 0) + (p.BathroomsFull || 0) + (p.BathroomsHalf || 0);
      return total <= filters.maxRooms!;
    });
  }

  return out;
}