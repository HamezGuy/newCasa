import { NextRequest, NextResponse } from 'next/server';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request (preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const zipCodes = searchParams.get('zipCodes')?.split(',') || [];
    const limitToTwenty = searchParams.get('limitToTwenty') === 'true';
    
    // Your Paragon API logic here
    // For now, return a stub response
    const mockResponse = {
      success: true,
      properties: [],
      message: "API endpoint created successfully"
    };
    
    return NextResponse.json(mockResponse, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('Error in Paragon API route:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch properties',
      message: error.message || 'Unknown error'
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const data = await request.json();
    
    // Your Paragon API logic here
    // For now, return a stub response
    const mockResponse = {
      success: true,
      message: "Data received successfully",
      data: data
    };
    
    return NextResponse.json(mockResponse, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('Error in Paragon API route:', error);
    
    return NextResponse.json({
      error: 'Failed to process request',
      message: error.message || 'Unknown error'
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}