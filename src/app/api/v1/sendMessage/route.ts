import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Define MessageData interface
interface MessageData {
  message: string;
  clientEmail: string;
  propertyId: string;
  clientId: string;
  realtorEmail?: string;
  realtorPhoneNumber?: string;
}

// Handle OPTIONS request (preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  console.log("API route /api/v1/sendMessage called");
  
  try {
    // Parse the request body
    const data = await request.json() as MessageData;
    console.log("Request data:", data);
    
    // Call the Firebase HTTP function (updated to use the v1 version)
    try {
      const result = await axios.post(
        'https://us-central1-rondevu-edbb7.cloudfunctions.net/sendMessageToRealtorHttpV1',
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://getnewcasa.com'
          },
        }
      );
      
      console.log("Firebase function result:", result.data);
      
      // Return the result
      return NextResponse.json(result.data, {
        status: 200,
        headers: corsHeaders,
      });
    } catch (apiError: any) {
      console.error("API call error:", apiError);
      
      // Return a more detailed error response
      return NextResponse.json({
        error: 'API call error',
        message: apiError.message || 'Unknown API error',
        status: apiError.response?.status,
        data: apiError.response?.data
      }, {
        status: apiError.response?.status || 500,
        headers: corsHeaders,
      });
    }
  } catch (error: any) {
    console.error('Error in API route:', error);
    
    // Return detailed error response
    return NextResponse.json({
      error: 'Failed to send message',
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}