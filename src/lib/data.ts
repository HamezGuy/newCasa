import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';
import IParagonProperty from '@/types/IParagonProperty';
import paragonApiClient from './ParagonApiClient';

export interface searchQuery {
  s: string;
  rent?: string;
  type?: string[];
  maxPrice?: string;
  minPrice?: string;
}

export async function getPropertyById(
  id: string
): Promise<ParagonPropertyWithMedia> {
  console.log('Fetching real property data by ID from API...');
  const property = await paragonApiClient.getPropertyById(id);

  if (!property) {
    console.error(`Failed to get property (ListingId): ${id}`);
    throw new Error(`Failed to get property (ListingId): ${id}`);
  }

  return property;
}

export async function getPropertiesBySearchTerm(
  searchTerm: string
): Promise<IParagonProperty[]> {
  console.log('Fetching properties for search term:', searchTerm);

  const result = await paragonApiClient.getAllPropertyWithMedia();

  // Filter the properties by the search term
  const filteredProperties = result.filter(
    (property: IParagonProperty) =>
      property.PostalCode === searchTerm ||
      (property.StreetName &&
        property.StreetName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return filteredProperties;
}

export async function getPropertiesByQuery(
  query: searchQuery
): Promise<IParagonProperty[]> {
  const result = await paragonApiClient.getAllPropertyWithMedia();

  const filteredProperties = result.filter((property) => {
    // Filter by Sale or Rent
    if (
      (query.rent && !property.PropertyType.toLowerCase().includes('lease')) ||
      (!query.rent && property.PropertyType.toLowerCase().includes('lease'))
    ) {
      return false;
    }

    // TODO: Filter by Type
    if (
      query.type &&
      query.type.length > 0 &&
      property.PropertySubType &&
      !query.type.includes(property.PropertySubType.toLowerCase())
    ) {
      return false;
    }

    // Filter by Price
    if (
      (query.minPrice && parseFloat(query.minPrice) > property.ListPrice) ||
      (query.maxPrice && parseFloat(query.maxPrice) < property.ListPrice)
    ) {
      return false;
    }

    // Filter by search query
    if (
      query.s &&
      property.PostalCode !== query.s &&
      property.StreetName &&
      !property.StreetName.toLowerCase().includes(query.s.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  return filteredProperties;
}

export const getZipCodeTitle = (zipCode: string) => {
  const zipCodeTitles: Record<string, string> = {
    '53703': 'Middleton, WI', //TODO have this only in configuration //note: currently this the title for what's in configuraiton...
    '53715': 'Madison, WI',
  };

  return zipCodeTitles[zipCode] || 'Unknown';
};

export async function getPropertiesByZipCode(): Promise<
  {
    zipCode: string;
    zipCodeTitle: string;
    properties: IParagonProperty[];
  }[]
> {
  console.log('Fetching properties by zip code');

  const filteredProperties = await paragonApiClient.getAllPropertyWithMedia();

  // Group the properties by zip code
  const propertiesByZipCode: Record<
    string,
    {
      zipCode: string;
      zipCodeTitle: string;
      properties: IParagonProperty[];
    }
  > = {};

  filteredProperties.forEach((property: IParagonProperty) => {
    if (!propertiesByZipCode[property.PostalCode]) {
      propertiesByZipCode[property.PostalCode] = {
        zipCode: property.PostalCode ?? '',
        zipCodeTitle: getZipCodeTitle(property.PostalCode) ?? '',
        properties: [],
      };
    }
    propertiesByZipCode[property.PostalCode].properties.push(property);
  });

  // What's the point of this code?
  // // Flatten the grouped properties and return up to PROPERTY_LIMIT properties
  // const limitedProperties = Object.values(propertiesByZipCode)
  //   .flatMap((group) => group.properties)
  //   .slice(0, PROPERTY_LIMIT);

  // console.log(
  //   `Returning ${limitedProperties.length} properties with the limit applied`
  // );

  return Object.values(
    Object.fromEntries(
      Object.entries(propertiesByZipCode).map(([zip, group]) => [
        zip,
        { ...group, properties: group.properties },
      ])
    )
  );
}

export async function getProperties(): Promise<IParagonProperty[]> {
  // Fetch properties with pagination
  const allProperties = await paragonApiClient.getAllPropertyWithMedia();

  if (allProperties.length === 0) {
    console.warn('No properties found');
    return [];
  }

  console.log(`Fetched ${allProperties.length} properties`);
  return allProperties;
}
