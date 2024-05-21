import IParagonProperty from '@/types/IParagonProperty';
import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';

export async function getPropertyById(id: string): Promise<ParagonPropertyWithMedia> {
  const url = `${process.env.BASE_API_URL}/api/v1/listings?id=${id}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to get property (ListingId): ${id}`);
  }

  const property = await res.json();
  return property[0];
}

export async function getPropertyByIdV2(id: string): Promise<ParagonPropertyWithMedia> {
  const properties = await getPropertiesV2();
  const property = properties.find((property) => property.ListingId === id) ?? null;

  if (!property) {
    throw new Error(`Failed to get property (ListingId): ${id}`);
  }

  return property;
}

export async function getProperties(searchTerm: string) {
  //   await new Promise((resolve) => setTimeout(resolve, 2000)); // TODO: remove
  const url = `${process.env.BASE_API_URL}/api/reso/test?searchTerm=${searchTerm}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to search for ${searchTerm}`);
  }

  return res.json();
}

export const getZipCodeTitle = (zipCode: string) => {
  const zipCodeTitles: Record<string, string> = {
    '53715': 'Madison, WI',
    '53703': 'Madison, WI',
  };

  return zipCodeTitles[zipCode] || 'Unknown';
};

export async function getPropertiesByZipCode(): Promise<{
  zipCode: string,
  zipCodeTitle: string,
  properties: IParagonProperty[]
}[]> {
  const properties = await getPropertiesV2();

  const propertiesByZipCode: Record<string, {
    zipCode: string,
    zipCodeTitle: string,
    properties: IParagonProperty[]
  }> = {};

  properties.forEach((property: IParagonProperty) => {
    if (!propertiesByZipCode[property.PostalCode]) {
      propertiesByZipCode[property.PostalCode] = {
        zipCode: property.PostalCode ?? '',
        zipCodeTitle: getZipCodeTitle(property.PostalCode) ?? '',
        properties: [],
      };
    }
    propertiesByZipCode[property.PostalCode].properties.push(property);
  });

  return Object.values(propertiesByZipCode);
}

export async function getPropertiesV2(): Promise<IParagonProperty[]> {
  const url = `${process.env.BASE_API_URL}/api/v1/listings`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to get properties`);
  }

  return res.json();
}