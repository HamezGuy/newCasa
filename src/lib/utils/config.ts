export const isProduction =
  process.env.VERCEL_ENV == "production" ||
  process.env.NODE_ENV === "production";
