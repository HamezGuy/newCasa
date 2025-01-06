// src/app/api/v1/listings/route.ts

import { NextRequest, NextResponse } from "next/server";
import paragonApiClient from "@/lib/ParagonApiClient";
import { Redis } from "@upstash/redis"; // <-- NEW

// If your env vars are named differently, see Upstash docs for config.
const redis = Redis.fromEnv(); // uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

export async function GET(request: NextRequest) {
  // ADDED LOGGING
  console.log("[GET /api/v1/listings] => Triggered endpoint.");

  // Parse params
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get("zipCode");
  const streetName = searchParams.get("streetName");
  const propertyId = searchParams.get("propertyId");
  const city = searchParams.get("city");
  const county = searchParams.get("county");

  // ADDED LOGGING
  console.log("[GET /api/v1/listings] => Query parameters received:", {
    zipCode,
    streetName,
    propertyId,
    city,
    county,
  });

  // ----------------------------------------------------------
  // 1) Build a simple cache key from the query
  // ----------------------------------------------------------
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

  // ADDED LOGGING
  console.log("[GET /api/v1/listings] => Computed cacheKey:", cacheKey);

  try {
    // ----------------------------------------------------------
    // 2) Check if we have cached data for this key
    // ----------------------------------------------------------
    // ADDED LOGGING
    console.log(`[GET /api/v1/listings] => Checking Redis cache for key: "${cacheKey}"`);
    const cached = await redis.get(cacheKey);
    // ADDED LOGGING
    console.log(`[GET /api/v1/listings] => Redis GET result:`, cached ? "HIT" : "MISS");

    if (cached) {
      console.log("[GET /api/v1/listings] => Cache hit for key:", cacheKey);
      return NextResponse.json(cached, { status: 200 });
    }

    // If no cache found => do the normal fetch
    let properties = [];

    // ADDED LOGGING
    console.log("[GET /api/v1/listings] => No cache found, proceeding to fetch from Paragon...");

    if (zipCode) {
      console.log(`[GET /api/v1/listings] => searchByZipCode("${zipCode}")`);
      const response = await paragonApiClient.searchByZipCode(zipCode);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => Fetched ${properties.length} properties by zipCode: ${zipCode}`);
    } else if (streetName) {
      console.log(`[GET /api/v1/listings] => searchByStreetName("${streetName}")`);
      const response = await paragonApiClient.searchByStreetName(streetName);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => Fetched ${properties.length} properties by streetName: ${streetName}`);
    } else if (propertyId) {
      console.log(`[GET /api/v1/listings] => getPropertyById("${propertyId}")`);
      const property = await paragonApiClient.getPropertyById(propertyId);
      properties = property ? [property] : [];
      console.log(`[GET /api/v1/listings] => Fetched 1 property by propertyId: ${propertyId}`);
    } else if (city) {
      console.log(`[GET /api/v1/listings] => searchByCity("${city}")`);
      const response = await paragonApiClient.searchByCity(city);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => Fetched ${properties.length} properties by city: ${city}`);
    } else if (county) {
      console.log(`[GET /api/v1/listings] => searchByCounty("${county}")`);
      const response = await paragonApiClient.searchByCounty(county);
      properties = response?.value || [];
      console.log(`[GET /api/v1/listings] => Fetched ${properties.length} properties by county: ${county}`);
    } else {
      console.log("[GET /api/v1/listings] => No valid query => calling getAllProperty...");
      const all = await paragonApiClient.getAllProperty();
      properties = all || [];
      console.log(`[GET /api/v1/listings] => Fetched ${properties.length} total properties (no query).`);
    }

    // ADDED LOGGING
    console.log(`[GET /api/v1/listings] => fetch complete. Final property count: ${properties.length}`);

    // ----------------------------------------------------------
    // 3) Store the result in Redis with a TTL (e.g. 300s = 5 min)
    // ----------------------------------------------------------
    // You could store for longer or shorter depending on your needs
    console.log(`[GET /api/v1/listings] => Storing result in Redis under key: "${cacheKey}" with TTL=300s`);
    await redis.set(cacheKey, properties, { ex: 300 });
    console.log(`[GET /api/v1/listings] => Successfully cached the result under "${cacheKey}"`);

    // ADDED LOGGING
    console.log("[GET /api/v1/listings] => Returning JSON response...");

    return NextResponse.json(properties, { status: 200 });
  } catch (error: any) {
    // ADDED LOGGING
    console.error("[GET /api/v1/listings] => CAUGHT ERROR!", {
      message: error.message,
      stack: error.stack,
      originalError: error,
    });
    return NextResponse.json(
      { error: "Failed to fetch properties from API", details: error?.message },
      { status: 500 }
    );
  }
}
