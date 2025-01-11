import { NextResponse } from "next/server";
import { redis } from "../../../../lib/utils/redis";

export async function GET() {
  try {
    await redis.set("myKey", "Hello from Upstash");
    const value = await redis.get("myKey");
    return NextResponse.json({ value });
  } catch (err) {
    console.error("Redis error:", err);
    return NextResponse.json({ error: "Failed to use Redis" }, { status: 500 });
  }
}
