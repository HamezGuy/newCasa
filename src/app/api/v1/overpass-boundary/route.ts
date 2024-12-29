import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Minimal Overpass route to fetch boundary polygons for a placeName
 * matching admin_level=8 (typical city boundary).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeName = searchParams.get('place');
  if (!placeName) {
    return NextResponse.json({ error: 'Missing "place" param' }, { status: 400 });
  }

  // Overpass query => find the relation with name=<placeName> & admin_level=8
  const overpassQuery = `
    [out:json];
    relation["name"="${placeName}"]["admin_level"="8"];
    (._;>;);
    out body;
  `;
  const url = 'https://overpass-api.de/api/interpreter';

  try {
    const response = await axios.post(
      url,
      `data=${encodeURIComponent(overpassQuery)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000, // 20 seconds
      }
    );

    // Parse Overpass data => array of polygon coords
    const polygons = parseOverpassToPolygons(response.data);
    return NextResponse.json({ polygons }, { status: 200 });
  } catch (error: any) {
    console.error('Overpass fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch boundary from Overpass' }, { status: 500 });
  }
}

/**
 * parseOverpassToPolygons => minimal logic:
 *   1) gather nodes
 *   2) for each WAY => build coords
 */
function parseOverpassToPolygons(overpassData: any) {
  const nodesMap: Record<number, { lat: number; lng: number }> = {};
  const polygons: Array<Array<{ lat: number; lng: number }>> = [];

  for (const elem of overpassData.elements) {
    if (elem.type === 'node') {
      nodesMap[elem.id] = { lat: elem.lat, lng: elem.lon };
    }
  }

  for (const elem of overpassData.elements) {
    if (elem.type === 'way') {
      const coords: Array<{ lat: number; lng: number }> = [];
      for (const nodeId of elem.nodes) {
        const node = nodesMap[nodeId];
        if (node) {
          coords.push({ lat: node.lat, lng: node.lng });
        }
      }
      // If it has enough points => push
      if (coords.length > 2) {
        polygons.push(coords);
      }
    }
  }
  return polygons;
}
