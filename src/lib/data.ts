import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import IParagonProperty from "@/types/IParagonProperty";

export async function getPropertyById(
  id: string
): Promise<ParagonPropertyWithMedia> {
  const properties = await getProperties();
  const property =
    properties.find((property) => property.ListingId === id) ?? null;

  if (!property) {
    throw new Error(`Failed to get property (ListingId): ${id}`);
  }

  return property;
}

export async function getPropertiesBySearchTerm(
  searchTerm: string
): Promise<IParagonProperty[]> {
  const properties = await getProperties();

  // TODO: Improve search
  return properties.filter(
    (property: IParagonProperty) =>
      property.PostalCode == searchTerm ||
      property.StreetName.includes(searchTerm)
  );
}

export const getZipCodeTitle = (zipCode: string) => {
  const zipCodeTitles: Record<string, string> = {
    "53715": "Madison, WI",
    "53703": "Madison, WI",
  };

  return zipCodeTitles[zipCode] || "Unknown";
};

export async function getPropertiesByZipCode(): Promise<
  {
    zipCode: string;
    zipCodeTitle: string;
    properties: IParagonProperty[];
  }[]
> {
  const properties = await getProperties();

  const propertiesByZipCode: Record<
    string,
    {
      zipCode: string;
      zipCodeTitle: string;
      properties: IParagonProperty[];
    }
  > = {};

  properties.forEach((property: IParagonProperty) => {
    if (!propertiesByZipCode[property.PostalCode]) {
      propertiesByZipCode[property.PostalCode] = {
        zipCode: property.PostalCode ?? "",
        zipCodeTitle: getZipCodeTitle(property.PostalCode) ?? "",
        properties: [],
      };
    }
    propertiesByZipCode[property.PostalCode].properties.push(property);
  });

  return Object.values(propertiesByZipCode);
}

export async function getProperties(): Promise<IParagonProperty[]> {
  const url = `${process.env.BASE_API_URL}/api/v1/listings`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to get properties`);
  }

  return res.json();
}
