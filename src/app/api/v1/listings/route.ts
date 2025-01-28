// src/app/api/v1/listings/route.ts

import { NextRequest, NextResponse } from "next/server";
import paragonApiClient from "@/lib/ParagonApiClient";
// import { Redis } from "@upstash/redis";  // <-- TEMPORARILY COMMENTED OUT

export const dynamic = "force-dynamic";

// TODO: Re-implement Redis caching once Upstash is working again
// const redis = Redis.fromEnv();  // uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

export async function GET(request: NextRequest) {
  console.log("Triggered: /api/v1/listings");

  // Parse params
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const propertyId = searchParams.get("propertyId");
  const city = searchParams.get("city");
  const county = searchParams.get("county");

  console.log("Query parameters received:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
  });

  // e.g. listings::zip::53713 or listings::all
  let cacheKey = "listings::";
  if (zipCode) {
    cacheKey += `zip::${zipCode}`;
  } else if (streetName) {
    cacheKey += `street::${streetName}`;
  } else if (propertyId) {
    cacheKey += `id::${propertyId}`;
  } else if (city) {
    cacheKey += `city::${city}`;
  } else if (county) {
    cacheKey += `county::${county}`;
  } else {
    cacheKey += "all";
  }

  try {
    // ----------------------------------------------------------
    // 1) Temporarily skip Redis read
    // ----------------------------------------------------------
    /*
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("Cache hit for", cacheKey);
      return NextResponse.json(cached, { status: 200 });
    }
    */

    let properties: any[] = [];

    if (zipCode) {
      console.log(`Fetching properties for zipCode: ${zipCode}`);
      const response = await paragonApiClient.searchByZipCode(zipCode);
      properties = response?.value || [];
      console.log(`Fetched ${properties.length} properties for zipCode: ${zipCode}`);
    } else if (streetName) {
      console.log(`Fetching properties for streetName: ${streetName}`);
      const response = await paragonApiClient.searchByStreetName(streetName);
      properties = response?.value || [];
      console.log(`Fetched ${properties.length} properties for streetName: ${streetName}`);
    } else if (propertyId) {
      console.log(`Fetching property for propertyId: ${propertyId}`);
      const property = await paragonApiClient.getPropertyById(propertyId);
      properties = property ? [property] : [];
      console.log(`Fetched property with propertyId: ${propertyId}`);
    } else if (city) {
      console.log(`Fetching properties for city: ${city}`);
      const response = await paragonApiClient.searchByCity(city);
      properties = response?.value || [];
      console.log(`Fetched ${properties.length} properties for city: ${city}`);
    } else if (county) {
      console.log(`Fetching properties for county: ${county}`);
      const response = await paragonApiClient.searchByCounty(county);
      properties = response?.value || [];
      console.log(`Fetched ${properties.length} properties for county: ${county}`);
    } else {
      // -------------------------------------------
      // CHANGED: Return empty array if no query
      // -------------------------------------------
      console.log("No search param provided => returning empty array.");
      properties = [];
    }

    console.log(`Successfully fetched ${properties.length} properties.`);

    // ----------------------------------------------------------
    // 2) Temporarily skip Redis write
    // ----------------------------------------------------------
    /*
    await redis.set(cacheKey, properties, { ex: 300 });
    */

    return NextResponse.json(properties, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/v1/listings:", {
      message: error.message,
      stack: error.stack,
      originalError: error,
    });
    return NextResponse.json(
      { error: "Failed to fetch properties from API" },
      { status: 500 }
    );
  }
}
