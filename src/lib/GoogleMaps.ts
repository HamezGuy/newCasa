import IParagonProperty from '@/types/IParagonProperty';
import { Client } from '@googlemaps/google-maps-services-js';

export async function geocodeProperties(
  properties: IParagonProperty[]
): Promise<IParagonProperty[]> {
  if (!process.env.GOOGLE_MAPS_BACKEND_API) {
    console.error(
      `Could not geocode properties. GOOGLE_MAPS_BACKEND_API missing`
    );
    return properties;
  }

  const apiKey = process.env.GOOGLE_MAPS_BACKEND_API;
  const client = new Client({});

  for (const property of properties) {
    const address = `${property.StreetNumber} ${
      property.StreetDirPrefix ?? ''
    } ${property.StreetName} ${property.StreetSuffix ?? ''}, ${
      property.PostalCity ?? ''
    } ${property.StateOrProvince ?? ''}`;

    try {
      const response = await client.geocode({
        params: { key: apiKey, address },
      });
      const results = response.data.results;

      if (results.length > 0) {
        const latLng = results[0].geometry.location;
        property.Latitude = latLng.lat;
        property.Longitude = latLng.lng;
      } else {
        console.error(`No results found for address: ${address}`);
      }
    } catch (error) {
      console.error(`Error geocoding address: ${address}`, error);
    }
  }

  return properties;
}
