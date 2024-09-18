import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import IParagonProperty from "@/types/IParagonProperty";
import paragonApiClient from "./ParagonApiClient";

// Adjustable limit for the number of properties to display
const PROPERTY_LIMIT = 12; //TODO move this into configiration 

export async function getPropertyById(
  id: string
): Promise<ParagonPropertyWithMedia> {
  if (process.env.MOCK_DATA && process.env.MOCK_DATA === "true") {
    console.log("Using mock data for getPropertyById");
    const properties_mock = require("../../data/properties.json");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return properties_mock.value[0];
  }

  console.log("Fetching real property data by ID from API...");
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
  console.log("Fetching properties for search term:", searchTerm);

  let filteredProperties: IParagonProperty[] = [];
  let page = 1;
  let result: IParagonProperty[] = [];

  // Keep fetching and filtering until we have enough properties
  while (filteredProperties.length < PROPERTY_LIMIT) {
    result = await paragonApiClient.getAllPropertyWithMedia(undefined, page);

    if (result.length === 0) {
      // No more properties available from API
      console.log("No more properties available.");
      break;
    }

    // Filter the properties by the search term
    const filteredPage = result.filter(
      (property: IParagonProperty) =>
        property.PostalCode === searchTerm ||
        (property.StreetName && property.StreetName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Add filtered properties to the final result
    filteredProperties = filteredProperties.concat(filteredPage);

    page++; // Move to the next page for the next iteration
  }

  // Ensure only PROPERTY_LIMIT properties are returned
  return filteredProperties.slice(0, PROPERTY_LIMIT);
}

export const getZipCodeTitle = (zipCode: string) => {
  const zipCodeTitles: Record<string, string> = {
    "53703": "Middleton, WI", //TODO have this only in configuration //note: currently this the title for what's in configuraiton...
    "53715": "Madison, WI",
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
  console.log("Fetching properties by zip code");

  let filteredProperties: IParagonProperty[] = [];
  let page = 1;
  let result: IParagonProperty[] = [];

  // Fetch and filter properties until PROPERTY_LIMIT is reached
  while (filteredProperties.length < PROPERTY_LIMIT) {
    result = await paragonApiClient.getAllPropertyWithMedia(undefined, page);

    if (result.length === 0) {
      // No more properties available from API
      console.log("No more properties available.");
      break;
    }

    filteredProperties = filteredProperties.concat(result);

    page++; // Move to the next page
  }

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
        zipCode: property.PostalCode ?? "",
        zipCodeTitle: getZipCodeTitle(property.PostalCode) ?? "",
        properties: [],
      };
    }
    propertiesByZipCode[property.PostalCode].properties.push(property);
  });

  // Flatten the grouped properties and return up to PROPERTY_LIMIT properties
  const limitedProperties = Object.values(propertiesByZipCode)
    .flatMap(group => group.properties)
    .slice(0, PROPERTY_LIMIT);

  console.log(`Returning ${limitedProperties.length} properties with the limit applied`);

  return Object.values(
    Object.fromEntries(
      Object.entries(propertiesByZipCode).map(([zip, group]) => [
        zip,
        { ...group, properties: group.properties.slice(0, PROPERTY_LIMIT) },
      ])
    )
  );
}

export async function getProperties(): Promise<IParagonProperty[]> {
  if (process.env.MOCK_DATA && process.env.MOCK_DATA === "true") {
    console.log("Using mock data for getProperties");
    const properties_mock = require("../../data/properties.json");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("Returning mock data for properties");

    return properties_mock.value;
  }

  console.log("Fetching real properties from API...");
  let allProperties: IParagonProperty[] = [];
  let page = 1;
  let result: IParagonProperty[] = [];

  // Fetch properties with pagination
  do {
    result = await paragonApiClient.getAllPropertyWithMedia(undefined, page);
    allProperties = allProperties.concat(result);
    page++;
  } while (result.length > 0);

  if (allProperties.length === 0) {
    console.warn("No properties found");
    return [];
  }

  console.log(`Fetched ${allProperties.length} properties`);
  return allProperties;
}
