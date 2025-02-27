import { NextRequest, NextResponse } from "next/server";
import paragonApiClient from "@/lib/ParagonApiClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") || "842 S Brooks St, Madison, WI 53715, USA";
  const radiusStr = searchParams.get("radius");
  const radius = radiusStr ? parseFloat(radiusStr) : 0;
  
  console.log("Test searchByAddress route called with address:", address, "radius:", radius);
  
  try {
    // First, geocode the address to show the components
    console.log("Geocoding the address:", address);
    const geocodeResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    
    const geocodeData = await geocodeResponse.json();
    const geocodeSuccess = geocodeData.status === "OK" && geocodeData.results && geocodeData.results.length > 0;
    
    // Extract address components if available
    let addressComponents = null;
    let formattedAddress = null;
    let streetNumber = null;
    let streetName = null;
    let city = null;
    
    if (geocodeSuccess) {
      addressComponents = geocodeData.results[0].address_components;
      formattedAddress = geocodeData.results[0].formatted_address;
      
      streetNumber = addressComponents.find((c: any) => 
        c.types.includes("street_number")
      )?.long_name;
      
      streetName = addressComponents.find((c: any) => 
        c.types.includes("route")
      )?.long_name;
      
      city = addressComponents.find((c: any) => 
        c.types.includes("locality") || c.types.includes("sublocality")
      )?.long_name;
    }
    
    // Now call the searchByAddress method
    console.log("Calling paragonApiClient.searchByAddress directly...");
    const response = await paragonApiClient.searchByAddress(address, radius, undefined, true);
    console.log("Direct searchByAddress response:", response);
    
    return NextResponse.json({
      success: true,
      address: address,
      radius: radius,
      responseContext: response["@odata.context"],
      propertiesFound: response.value.length,
      properties: response.value.map(p => ({
        ListingKey: p.ListingKey,
        ListPrice: p.ListPrice,
        StreetNumber: p.StreetNumber,
        StreetName: p.StreetName,
        City: p.City,
        StandardStatus: p.StandardStatus
      })),
      geocoding: {
        success: geocodeSuccess,
        status: geocodeData.status,
        formattedAddress,
        extractedComponents: {
          streetNumber,
          streetName,
          city
        },
        fullComponents: addressComponents
      }
    });
  } catch (error: any) {
    console.error("Error testing searchByAddress:", error);
    
    return NextResponse.json({
      success: false,
      address: address,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}