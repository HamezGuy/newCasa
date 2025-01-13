// src/app/api/v1/redis-test/route.ts

import { NextResponse } from "next/server";
// import { redis } from "@/lib/utils/redis"; // <-- TEMPORARILY COMMENTED OUT

// TODO: Re-implement Redis test once Upstash is working again

export async function GET() {
  try {
    // Temporarily do nothing with Redis
    /*
    await redis.set("myKey", "Hello from Upstash");
    const value = await redis.get("myKey");
    return NextResponse.json({ value });
    */

    // For now, return a placeholder value:
    return NextResponse.json({
      value: "Redis temporarily disabled. Nothing was cached.",
    });
  } catch (err) {
    console.error("Redis error:", err);
    return NextResponse.json({ error: "Failed to use Redis" }, { status: 500 });
  }
}
