// D:\NewCasa\newcasa\src\lib\utils\redis.ts

import { Redis } from "@upstash/redis";

/**
 * Throws if env vars are missing (optional safety check).
 */
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("Missing Upstash Redis environment variables!");
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
