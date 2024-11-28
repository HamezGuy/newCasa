import paragonApiClient from '@/lib/ParagonApiClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zipCode');

  try {
    let properties;

    if (zipCode) {
      console.log(`Fetching properties for zipCode: ${zipCode}`);
      const response = await paragonApiClient.searchByZipCode(zipCode);
      properties = response.value || [];
    } else {
      console.log('Fetching all properties...');
      properties = await paragonApiClient.getAllPropertyWithMedia();
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json([], { status: 404 });
    }

    return NextResponse.json(properties, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching properties:', error.message);
      return new NextResponse(`Failed to fetch properties: ${error.message}`, {
        status: 500,
      });
    } else {
      console.error('Unknown error:', error);
      return new NextResponse('An unknown error occurred.', { status: 500 });
    }
  }
}
