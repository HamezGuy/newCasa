import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface MessageData {
  message: string;
  clientEmail: string;
  propertyId: string;
  clientId: string;
  realtorEmail?: string;
  realtorPhoneNumber?: string;
}

export async function OPTIONS() {
  // Handle the preflight (CORS) request
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  console.log("API route /api/v1/sendMessage called");
  try {
    // Parse the request body
    const data = (await request.json()) as MessageData;
    console.log("Request data:", data);

    // Updated to match the 'newcasa-feecb' project
    const functionUrl =
      "https://us-central1-newcasa-feecb.cloudfunctions.net/sendMessageToRealtorHttpV1";
    console.log("Calling Firebase function at:", functionUrl);

    try {
      const result = await axios.post(functionUrl, data, {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://getnewcasa.com",
        },
        timeout: 10000,
      });
      console.log("Firebase function result:", result.data);

      return NextResponse.json(result.data, {
        status: 200,
        headers: corsHeaders,
      });
    } catch (apiError: any) {
      console.error("Firebase function error:", apiError);

      // Optional fallback to a second URL if you have another function
      if (apiError.response?.status === 404) {
        console.error("Function not found. Trying alternative URL...");
        try {
          const alternativeUrl =
            "https://us-central1-newcasa-feecb.cloudfunctions.net/sendMessageToRealtorHttp";
          console.log("Trying alternative URL:", alternativeUrl);

          const result = await axios.post(alternativeUrl, data, {
            headers: {
              "Content-Type": "application/json",
              Origin: "https://getnewcasa.com",
            },
            timeout: 10000,
          });
          console.log("Alternative function call succeeded:", result.data);

          return NextResponse.json(result.data, {
            status: 200,
            headers: corsHeaders,
          });
        } catch (altError: any) {
          console.error("Alternative function call failed:", altError);
          throw new Error(
            `Both function URLs failed. Original error: ${apiError.message}, Alternative error: ${altError.message}`
          );
        }
      }

      // If not a 404, just return a generic error
      return NextResponse.json(
        {
          error: "API call error",
          message: apiError.message || "Unknown API error",
          status: apiError.response?.status,
          data: apiError.response?.data,
        },
        {
          status: apiError.response?.status || 500,
          headers: corsHeaders,
        }
      );
    }
  } catch (error: any) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      {
        error: "Failed to send message",
        message: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
