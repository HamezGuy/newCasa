import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import IParagonProperty from "@/types/IParagonProperty";
import paragonApiClient from "./ParagonApiClient";

export async function getPropertyById(
  id: string
): Promise<ParagonPropertyWithMedia> {
  if (process.env.MOCK_DATA) {
    const properties_mock = require("../../data/properties.json");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return properties_mock.value[0];
  }

  // TODO: Get the primary photo properly
  const property = await paragonApiClient.getPropertyById(id);

  if (!property) {
    throw new Error(`Failed to get property (ListingId): ${id}`);
  }

  return property;
}

export async function getPropertiesBySearchTerm(
  searchTerm: string
): Promise<IParagonProperty[]> {
  console.log("call getProperties() from getPropertiesBySearchTerm");
  const properties = await getProperties(); // uses cache

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
  console.log("call getProperties() from getPropertiesByZipCode");
  const properties = await getProperties(); // uses cache ?

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
  if (process.env.MOCK_DATA) {
    const properties_mock = require("../../data/properties.json");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return properties_mock.value;
  }

  // TODO: Get the primary photo properly or remove limit
  const properties = await paragonApiClient.getAllPropertyWithMedia(
    undefined,
    1
  );

  if (!properties || properties.length === 0) {
    console.log(`Did not find any properties`);
    return [];
  }

  return properties;
}
