import IParagonMedia, { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import IParagonProperty from "@/types/IParagonProperty";
import md5 from "crypto-js/md5";
import getConfig from "next/config";
import pMap from "p-map";
import path from "path";
import * as url from "url";
import { geocodeProperties } from "./GoogleMaps";

const { serverRuntimeConfig = {} } = getConfig() || {};
const zipCodes = serverRuntimeConfig.zipCodes || [];

// If set, we load from local JSON data instead of calling the remote API
const MOCK_DATA = process.env.MOCK_DATA === "true";

// Lazy-loaded variable so we only parse once
// Always keep it as an array (never null)
let mockDataCache: IParagonProperty[] = [];

function getMockProperties(): IParagonProperty[] {
  if (mockDataCache.length === 0) {
    // Adjust path if needed
    const data = require("../../data/properties.json");
    mockDataCache = data.value;
  }
  return mockDataCache;
}

interface ITokenResponse {
  token_type: "Bearer";
  access_token: string;
  expires_in: number;
}

interface ILocalToken {
  token: string;
  tokenExpiration: Date;
}

export interface IOdataResponse<T> {
  "@odata.context": string;
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
  value: T[];
}

export class ParagonApiClient {
  private __baseUrl: string;
  private __tokenUrl: string;
  private __clientId: string;
  private __clientSecret: string;
  private __accessToken: string | undefined;
  private __tokenExpiration: Date | undefined;

  private __maxPageSize = 2500;
  private __maxConcurrentQueries = 120;

  private __zipCodes: string[];
  private __limitToTwenty: boolean;

  constructor(
    baseUrl: string,
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
    limitToTwenty = false // CHANGED => default false if you want no slicing
  ) {
    console.log("[ParagonApiClient.constructor] => Initializing client with baseUrl:", baseUrl);
    this.__baseUrl = baseUrl;
    this.__tokenUrl = tokenUrl;
    this.__clientId = clientId;
    this.__clientSecret = clientSecret;
    this.__zipCodes = zipCodes;
    this.__limitToTwenty = limitToTwenty;

    console.log("[ParagonApiClient.constructor] => zipCodes from config:", this.__zipCodes);
    console.log("[ParagonApiClient.constructor] => limitToTwenty set to:", limitToTwenty);
  }

  // -----------------------------
  // Token initialization logic
  // -----------------------------
  public async initializeToken(): Promise<void> {
    console.log("[ParagonApiClient.initializeToken] => Checking for token file on server...");
    if (typeof window === "undefined") {
      const fs = await import("fs/promises");
      const filepath = path.join(process.cwd(), `tokens/.token${md5(this.__clientId)}`);
      console.log("[ParagonApiClient.initializeToken] => Token file path:", filepath);

      try {
        const data = await fs.readFile(filepath);
        const token = JSON.parse(data.toString()) as ILocalToken;
        this.__accessToken = token.token;
        this.__tokenExpiration = new Date(token.tokenExpiration);

        console.log(
          "[ParagonApiClient.initializeToken] => Loaded token from file. Expires on:",
          this.__tokenExpiration
        );
      } catch (err) {
        console.log("[ParagonApiClient.initializeToken] => Token file not found or unreadable:", err);
      }
    } else {
      console.log("[ParagonApiClient.initializeToken] => Called in browser, skipping token logic.");
    }
  }

  public async saveToken(token: string, expiration: Date): Promise<void> {
    console.log("[ParagonApiClient.saveToken] => Attempting to save token with expiration:", expiration);
    if (typeof window === "undefined") {
      const fs = await import("fs/promises");
      const dirpath = path.join(process.cwd(), `tokens`);
      const filepath = path.join(dirpath, `/.token${md5(this.__clientId)}`);

      try {
        await fs.mkdir(dirpath, { recursive: true });
        await fs.writeFile(filepath, JSON.stringify({ token, tokenExpiration: expiration }));
        console.log("[ParagonApiClient.saveToken] => Token saved successfully at:", filepath);
      } catch (err) {
        console.error("[ParagonApiClient.saveToken] => Error saving token file:", err);
      }
    } else {
      console.log("[ParagonApiClient.saveToken] => Running in browser, skipping file write.");
    }
  }

  public async forClientSecret(): Promise<ParagonApiClient> {
    if (MOCK_DATA) {
      return this;
    }

    console.log("[ParagonApiClient.forClientSecret] => Checking if token is still valid...");
    if (this.__accessToken && this.__tokenExpiration && new Date() < this.__tokenExpiration) {
      console.log("[ParagonApiClient.forClientSecret] => Existing token is valid.");
      return this;
    }

    console.log("[ParagonApiClient.forClientSecret] => Token expired or missing, requesting new token...");
    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("scope", "OData");

    const token = Buffer.from(`${this.__clientId}:${this.__clientSecret}`).toString("base64");
    const headers: HeadersInit = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${token}`,
    };

    const options: RequestInit = {
      method: "POST",
      headers,
      body: body.toString(),
      cache: "no-store",
    };

    console.log("[ParagonApiClient.forClientSecret] => About to fetch token from:", this.__tokenUrl);
    const response = await fetch(this.__tokenUrl, options);
    const tokenResponse = (await response.json()) as ITokenResponse;
    console.log("[ParagonApiClient.forClientSecret] => Token response:", tokenResponse);

    this.__accessToken = tokenResponse.access_token;
    this.__tokenExpiration = new Date(new Date().getTime() + tokenResponse.expires_in * 1000);

    await this.saveToken(this.__accessToken, this.__tokenExpiration);

    console.log("[ParagonApiClient.forClientSecret] => New token acquired. Expires on:", this.__tokenExpiration);
    return this;
  }

  private async __getAuthHeaderValue(): Promise<string> {
    console.log("[ParagonApiClient.__getAuthHeaderValue] => Ensuring valid token via forClientSecret()...");
    await this.forClientSecret();
    return `Bearer ${this.__accessToken}`;
  }

  // -----------------------------
  // GET Helpers
  // -----------------------------
  private async get<T>(url: string): Promise<IOdataResponse<T>> {
    if (MOCK_DATA) {
      return {
        "@odata.context": "mockData",
        value: [] as T[],
      };
    }

    console.log(`[ParagonApiClient.get] => Fetching URL: ${url}`);
    const headers: HeadersInit = {
      Authorization: await this.__getAuthHeaderValue(),
    };
    const options: RequestInit = { method: "GET", headers };
    let response: Response;

    try {
      response = await fetch(url, options);
    } catch (fetchError: any) {
      console.error("[ParagonApiClient.get] => Error making fetch call:", fetchError);
      throw new Error(`Fetch to ${url} failed: ${fetchError}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[ParagonApiClient.get] => Non-OK HTTP status: ${response.status}, Body: ${errorText}`
      );
      throw new Error(`Failed to fetch from ${url}, status: ${response.status}`);
    }

    try {
      const json = await response.json();
      console.log(`[ParagonApiClient.get] => Successfully parsed JSON from: ${url}`);
      return json as IOdataResponse<T>;
    } catch (parseError: any) {
      console.error("[ParagonApiClient.get] => Error parsing JSON response:", parseError);
      throw new Error(`Response from ${url} is invalid JSON`);
    }
  }

  private async getFollowNext<T>(url: string): Promise<IOdataResponse<T>> {
    console.log("[ParagonApiClient.getFollowNext] => Checking for @odata.nextLink from URL:", url);
    const response = await this.get<T>(url);

    if (response["@odata.nextLink"]) {
      const nextLink = response["@odata.nextLink"];
      console.log("[ParagonApiClient.getFollowNext] => Found nextLink, fetching more data from:", nextLink);

      const additional = await this.getFollowNext<T>(nextLink);
      response.value = response.value.concat(additional.value);
      delete response["@odata.nextLink"];
    } else {
      console.log("[ParagonApiClient.getFollowNext] => No nextLink found. Items so far:", response.value.length);
    }

    return response;
  }

  // -----------------------------
  // URL Helpers
  // -----------------------------
  private getRealtorFilters(): string {
    console.log("[ParagonApiClient.getRealtorFilters] => Building filters from zipCodes:", this.__zipCodes);
    if (!this.__zipCodes || this.__zipCodes.length === 0) {
      return "";
    }
    return this.__zipCodes.map((zipCode) => `PostalCode eq '${zipCode}'`).join(" or ");
  }

  private getPropertyUrl(top: number, skip?: number): string {
    console.log(`[ParagonApiClient.getPropertyUrl] => Building property URL with top=${top}, skip=${skip}`);
    const realtorFilters = this.getRealtorFilters();

    let filterStr = `StandardStatus eq 'Active'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)`;

    if (realtorFilters) {
      filterStr += ` and (${realtorFilters})`;
    }

    const topStr = top ? `&$top=${top}` : "";
    const skipStr = skip ? `&$skip=${skip}` : "";

    const finalUrl = `${this.__baseUrl}/Property?$count=true&$filter=${filterStr}${topStr}${skipStr}`;
    console.log("[ParagonApiClient.getPropertyUrl] => Final property URL:", finalUrl);
    return finalUrl;
  }

  private getMediaUrl(top: number, skip?: number, filter?: string): string {
    console.log(
      `[ParagonApiClient.getMediaUrl] => Building media URL with top=${top}, skip=${skip}, filter=${filter}`
    );
    const params = new URLSearchParams();
    params.append("$top", top.toString());
    if (skip) params.append("$skip", skip.toString());
    if (filter) params.append("$filter", filter);

    const finalUrl = `${this.__baseUrl}/Media?$select=MediaKey,MediaURL,Order,ResourceRecordKey,ModificationTimestamp&$count=true&${params.toString()}`;
    console.log("[ParagonApiClient.getMediaUrl] => Final media URL:", finalUrl);
    return finalUrl;
  }

  private generateMediaFilters(listingKeys: string[]): string[] {
    console.log("[ParagonApiClient.generateMediaFilters] => Received listingKeys count:", listingKeys.length);
    const baseURL = this.getMediaUrl(9999999, 9999999, "1");
    const maxURLLength = 2048;

    let mediaFilters: string[] = [];
    let accFilter = "";

    const getEncodedLength = (str: string) => url.format(url.parse(str, true)).length;

    const generateFilter = (id: string, isFirst: boolean) => {
      const prefix = isFirst ? "" : " or ";
      return `${prefix}ResourceRecordKey eq '${id}'`;
    };

    const pushNewFilter = (filter: string) => {
      if (filter !== "") {
        mediaFilters.push(filter);
      }
    };

    for (const id of listingKeys) {
      const currentFilter = generateFilter(id, accFilter === "");
      const currentURL = `${baseURL}${accFilter}${currentFilter}`;

      if (getEncodedLength(currentURL) <= maxURLLength) {
        accFilter += currentFilter;
      } else {
        pushNewFilter(accFilter);
        accFilter = generateFilter(id, true);
      }
    }
    pushNewFilter(accFilter);

    console.log(
      "[ParagonApiClient.generateMediaFilters] => Generated",
      mediaFilters.length,
      "filter chunks for listingKeys."
    );
    return mediaFilters;
  }

  // -----------------------------
  // Populate Media
  // -----------------------------
  public async populatePropertyMedia(
    properties: ParagonPropertyWithMedia[],
    limit: number = 0
  ): Promise<ParagonPropertyWithMedia[]> {
    console.log("[ParagonApiClient.populatePropertyMedia] => Called with properties.length =", properties.length);

    if (properties.length === 0) {
      console.log("[ParagonApiClient.populatePropertyMedia] => No properties to process, returning empty array.");
      return [];
    }

    // If mock data => do not fetch from real Media endpoint
    if (MOCK_DATA) {
      console.log("[ParagonApiClient.populatePropertyMedia] => In mock mode, skipping media fetching logic.");
      return properties;
    }

    // Build a dictionary listingKey => array of media
    const mediaByProperty: Record<string, IParagonMedia[]> = {};
    const listingKeys = properties.map((p) => p.ListingKey!);
    console.log("[ParagonApiClient.populatePropertyMedia] => Listing keys total:", listingKeys.length);

    // Create filter chunks for concurrency
    let queryFilters = this.generateMediaFilters(listingKeys);
    console.log("[ParagonApiClient.populatePropertyMedia] => queryFilters count:", queryFilters.length);

    await pMap(
      queryFilters,
      async (queryFilter: string) => {
        console.log("[ParagonApiClient.populatePropertyMedia] => Using filter chunk:", queryFilter);
        const mediaUrl = this.getMediaUrl(this.__maxPageSize, undefined, queryFilter);
        console.log("[ParagonApiClient.populatePropertyMedia] => getMediaUrl =>", mediaUrl);

        const mediaResponse = await this.get<IParagonMedia>(mediaUrl);
        const count = mediaResponse["@odata.count"] || 0;
        console.log(
          `[ParagonApiClient.populatePropertyMedia] => Received ${mediaResponse.value.length} feed items, count=${count}`
        );

        // If count > maxPageSize => get the rest
        if (count > this.__maxPageSize) {
          console.log("[ParagonApiClient.populatePropertyMedia] => count exceeds maxPageSize => fetching nextLink...");
          const additional = await this.getFollowNext<IParagonMedia>(
            this.getMediaUrl(count, this.__maxPageSize, queryFilter)
          );
          mediaResponse.value = mediaResponse.value.concat(additional.value);
        }

        mediaResponse.value.forEach((m) => {
          if (!m.MediaURL) return; // skip blank URL
          if (!mediaByProperty[m.ResourceRecordKey]) {
            mediaByProperty[m.ResourceRecordKey] = [m];
          } else {
            mediaByProperty[m.ResourceRecordKey].push(m);
          }
        });
      },
      { concurrency: this.__maxConcurrentQueries }
    );

    console.log("[ParagonApiClient.populatePropertyMedia] => Completed raw feed fetch. Attaching to properties...");

    // If limitToTwenty => only apply media to the first 'limit' properties
    const finalList = this.__limitToTwenty ? properties.slice(0, limit || 3) : properties;
    console.log("[ParagonApiClient.populatePropertyMedia] => limit scenario => finalList.length:", finalList.length);

    // Attach feed media to each property, remove duplicates & sort
    await pMap(
      finalList,
      async (property: ParagonPropertyWithMedia) => {
        const listingKey = property.ListingKey;
        let feedMedia = mediaByProperty[listingKey] || [];

        if (!feedMedia.length) {
          console.log(`[ParagonApiClient.populatePropertyMedia] => No media found for listingKey=${listingKey}`);
          return;
        }

        // remove duplicates based on MediaKey
        const uniqueMap = new Map<number, IParagonMedia>();
        feedMedia.forEach((m) => uniqueMap.set(m.MediaKey, m));
        feedMedia = Array.from(uniqueMap.values()).sort((a, b) => {
          const orderA = a.Order ?? 99999;
          const orderB = b.Order ?? 99999;
          return orderA - orderB;
        });

        property.Media = feedMedia;
        console.log(
          `[ParagonApiClient.populatePropertyMedia] => Attached feedMedia to property ${listingKey}. Count=`,
          feedMedia.length
        );
      },
      { concurrency: 5 }
    );

    console.log("[ParagonApiClient.populatePropertyMedia] => Finished attaching feed media to all properties.");
    return properties;
  }

  // -----------------------------
  // GET Single Property By ID
  // -----------------------------
  public async getPropertyById(
    id: string,
    includeMedia: boolean = true
  ): Promise<IParagonProperty> {
    console.log(`[ParagonApiClient.getPropertyById] => Called with id=${id}, includeMedia=${includeMedia}`);

    if (MOCK_DATA) {
      console.log("[ParagonApiClient.getPropertyById] => Using mock data mode for ID:", id);
      const allProps = getMockProperties();
      const found = allProps.filter(
        (p) => p.ListingId === id && p.LeaseConsideredYN !== true
      );
      console.log(`[ParagonApiClient.getPropertyById] => Found ${found.length} in mock data. Geocoding...`);

      const geocoded = await geocodeProperties(found);
      return geocoded[0] || null;
    }

    const propertyUrl = `${this.__baseUrl}/Property?$filter=ListingId eq '${id}'`; 
    console.log("[ParagonApiClient.getPropertyById] => Will fetch property from:", propertyUrl);

    const response = await this.get<ParagonPropertyWithMedia>(propertyUrl);
    console.log("[ParagonApiClient.getPropertyById] => fetch success => items:", response.value.length);

    const property = response.value[0] || null;
    if (!property || !includeMedia) {
      console.log("[ParagonApiClient.getPropertyById] => No property found or media excluded.");
      return property;
    }

    try {
      const listingKey = property.ListingKey;
      if (!listingKey) {
        console.warn("[getPropertyById] => No ListingKey => skipping media fetch.");
        return property;
      }

      const mediaUrl = this.getMediaUrl(9999, 0, `ResourceRecordKey eq '${listingKey}'`);
      console.log("[getPropertyById] => Will fetch media from:", mediaUrl);

      const mediaResponse = await this.get<IParagonMedia>(mediaUrl);
      let feedMedia = mediaResponse.value || [];
      console.log("[getPropertyById] => Found media count:", feedMedia.length);

      feedMedia = feedMedia
        .filter((m) => !!m.MediaURL)
        .reduce((acc: IParagonMedia[], item) => {
          if (!acc.find((x) => x.MediaKey === item.MediaKey)) {
            acc.push(item);
          }
          return acc;
        }, [])
        .sort((a, b) => {
          const orderA = a.Order ?? 99999;
          const orderB = b.Order ?? 99999;
          return orderA - orderB;
        });

      property.Media = feedMedia;
      console.log("[getPropertyById] => Attached sorted media => count:", feedMedia.length);
    } catch (err) {
      console.error("[getPropertyById] => Media fetch error:", err);
    }

    return property;
  }

  // -----------------------------
  // GET By ZIP
  // -----------------------------
  public async searchByZipCode(
    zipCode: string,
    includeMedia: boolean = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log(`[ParagonApiClient.searchByZipCode] => zipCode=${zipCode}, includeMedia=${includeMedia}`);

    if (MOCK_DATA) {
      console.log("[ParagonApiClient.searchByZipCode] => Using mock data, filtering by zip code...");
      const allProps = getMockProperties();
      const filtered = allProps.filter(
        (p) => p.PostalCode?.includes(zipCode) && p.LeaseConsideredYN !== true
      );

      const geocoded = await geocodeProperties(filtered);

      if (!includeMedia) {
        return {
          "@odata.context": "mockDataZipCode",
          value: geocoded,
        };
      }
      const withMedia = await this.populatePropertyMedia(geocoded);
      return {
        "@odata.context": "mockDataZipCode",
        value: withMedia,
      };
    }

    const encodedZipCode = encodeURIComponent(zipCode);
    let url = `${this.__baseUrl}/Property?$count=true
      &$filter=StandardStatus eq 'Active'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)
      and contains(PostalCode, '${encodedZipCode}')`;

    if (this.__limitToTwenty) {
      url += `&$top=50`;
    }

    console.log("[ParagonApiClient.searchByZipCode] => Final URL:", url);

    const response = await this.get<ParagonPropertyWithMedia>(url);
    console.log("[ParagonApiClient.searchByZipCode] => fetch success => items:", response.value.length);

    if (response.value && includeMedia && response.value.length > 0) {
      console.log("[ParagonApiClient.searchByZipCode] => populating media for properties...");
      response.value = await this.populatePropertyMedia(response.value);
    }

    return response;
  }

  // -----------------------------
  // GET By StreetName
  // -----------------------------
  public async searchByStreetName(
    streetName: string,
    includeMedia: boolean = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log(`[ParagonApiClient.searchByStreetName] => streetName=${streetName}, includeMedia=${includeMedia}`);

    if (MOCK_DATA) {
      console.log("[ParagonApiClient.searchByStreetName] => Using mock data => filtering by StreetName...");
      const allProps = getMockProperties();
      const lower = streetName.toLowerCase();
      const filtered = allProps.filter(
        (p) => p.StreetName?.toLowerCase().includes(lower) && p.LeaseConsideredYN !== true
      );

      const geocoded = await geocodeProperties(filtered);

      if (!includeMedia) {
        return {
          "@odata.context": "mockDataStreetName",
          value: geocoded,
        };
      }
      const withMedia = await this.populatePropertyMedia(geocoded);
      return {
        "@odata.context": "mockDataStreetName",
        value: withMedia,
      };
    }

    if (this.__limitToTwenty) {
      console.log("[ParagonApiClient.searchByStreetName] => limitToTwenty => &$top=50");
    }

    const encodedStreet = encodeURIComponent(streetName);
    let url = `${this.__baseUrl}/Property?$count=true
      &$filter=StandardStatus eq 'Active'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)
      and contains(StreetName, '${encodedStreet}')`;

    if (this.__limitToTwenty) {
      url += `&$top=50`;
    }

    console.log("[ParagonApiClient.searchByStreetName] => Final URL:", url);

    const response = await this.get<ParagonPropertyWithMedia>(url);
    console.log("[ParagonApiClient.searchByStreetName] => fetch success => items:", response.value.length);

    if (response.value && includeMedia && response.value.length > 0) {
      console.log("[ParagonApiClient.searchByStreetName] => populating media for properties...");
      response.value = await this.populatePropertyMedia(response.value);
    }

    return response;
  }

  // -----------------------------
  // GET All
  // -----------------------------
  public async getAllProperty(top?: number): Promise<IParagonProperty[]> {
    console.log(`[ParagonApiClient.getAllProperty] => Called with top=${top}`);

    if (MOCK_DATA) {
      console.log("[ParagonApiClient.getAllProperty] => Using mock data => returning entire file.");
      let allProps = getMockProperties();
      allProps = allProps.filter((p) => p.LeaseConsideredYN !== true);

      if (top && top < allProps.length) {
        allProps = allProps.slice(0, top);
      }
      const geocoded = await geocodeProperties(allProps);
      return geocoded;
    }

    if (this.__limitToTwenty) {
      console.log("[ParagonApiClient.getAllProperty] => limitToTwenty => forcing top=50.");
      top = 50;
    }

    const finalUrl = this.getPropertyUrl(top ? top : this.__maxPageSize);
    console.log("[ParagonApiClient.getAllProperty] => Will fetch from:", finalUrl);

    const response = await this.get<IParagonProperty>(finalUrl);
    console.log("[ParagonApiClient.getAllProperty] => fetch success => items:", response.value.length);

    // If top is set, skip nextLink logic
    if (!top) {
      const count = response["@odata.count"];
      if (count && count > this.__maxPageSize) {
        console.log("[ParagonApiClient.getAllProperty] => calling getFollowNext with count=", count);
        const nextData = await this.getFollowNext<IParagonProperty>(
          this.getPropertyUrl(count, this.__maxPageSize)
        );
        response.value = response.value.concat(nextData.value);
      }
    }

    console.log("[ParagonApiClient.getAllProperty] => final property length:", response.value.length);
    return response.value;
  }

  // -----------------------------
  // GET By City
  // -----------------------------
  public async searchByCity(
    city: string,
    includeMedia: boolean = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log(`[ParagonApiClient.searchByCity] => city=${city}, includeMedia=${includeMedia}`);

    if (MOCK_DATA) {
      console.log("[ParagonApiClient.searchByCity] => Using mock data => filtering by city...");
      const allProps = getMockProperties();
      const lower = city.toLowerCase();
      const filtered = allProps.filter(
        (p) => p.City?.toLowerCase().includes(lower) && p.LeaseConsideredYN !== true
      );

      const geocoded = await geocodeProperties(filtered);

      if (!includeMedia) {
        return {
          "@odata.context": "mockDataCity",
          value: geocoded,
        };
      }
      const withMedia = await this.populatePropertyMedia(geocoded);
      return {
        "@odata.context": "mockDataCity",
        value: withMedia,
      };
    }

    if (this.__limitToTwenty) {
      console.log("[ParagonApiClient.searchByCity] => limitToTwenty => &$top=50");
    }

    const encodedCity = encodeURIComponent(city);
    let url = `${this.__baseUrl}/Property?$count=true
      &$filter=StandardStatus eq 'Active'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)
      and contains(City, '${encodedCity}')`;

    if (this.__limitToTwenty) {
      url += `&$top=50`;
    }

    console.log("[ParagonApiClient.searchByCity] => Final URL:", url);

    const response = await this.get<ParagonPropertyWithMedia>(url);
    console.log("[ParagonApiClient.searchByCity] => fetch success => items:", response.value.length);

    if (response.value && includeMedia && response.value.length > 0) {
      console.log("[ParagonApiClient.searchByCity] => populating media for properties...");
      response.value = await this.populatePropertyMedia(response.value);
    }

    return response;
  }

  // -----------------------------
  // GET By County
  // -----------------------------
  public async searchByCounty(
    county: string,
    includeMedia: boolean = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log(`[ParagonApiClient.searchByCounty] => county=${county}, includeMedia=${includeMedia}`);

    if (MOCK_DATA) {
      console.log("[ParagonApiClient.searchByCounty] => Using mock data => filtering by county...");
      const allProps = getMockProperties();
      const lower = county.toLowerCase();
      const filtered = allProps.filter(
        (p) => p.CountyOrParish?.toLowerCase().includes(lower) && p.LeaseConsideredYN !== true
      );

      const geocoded = await geocodeProperties(filtered);

      if (!includeMedia) {
        return {
          "@odata.context": "mockDataCounty",
          value: geocoded,
        };
      }
      const withMedia = await this.populatePropertyMedia(geocoded);
      return {
        "@odata.context": "mockDataCounty",
        value: withMedia,
      };
    }

    if (this.__limitToTwenty) {
      console.log("[ParagonApiClient.searchByCounty] => limitToTwenty => &$top=50");
    }

    const encodedCounty = encodeURIComponent(county);
    let url = `${this.__baseUrl}/Property?$count=true
      &$filter=StandardStatus eq 'Active'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)
      and contains(CountyOrParish, '${encodedCounty}')`;

    if (this.__limitToTwenty) {
      url += `&$top=50`;
    }

    console.log("[ParagonApiClient.searchByCounty] => Final URL:", url);

    const response = await this.get<ParagonPropertyWithMedia>(url);
    console.log("[ParagonApiClient.searchByCounty] => fetch success => items:", response.value.length);

    if (response.value && includeMedia && response.value.length > 0) {
      console.log("[ParagonApiClient.searchByCounty] => populating media for properties...");
      response.value = await this.populatePropertyMedia(response.value);
    }

    return response;
  }

  // -----------------------------
  // GET All With Media
  // -----------------------------
  public async getAllPropertyWithMedia(
    top?: number,
    limit: number = 0
  ): Promise<IParagonProperty[]> {
    console.log("[ParagonApiClient.getAllPropertyWithMedia] => Called with top=", top, "limit=", limit);

    if (MOCK_DATA) {
      console.log("[ParagonApiClient.getAllPropertyWithMedia] => Using mock data for everything");
      let allProps = getMockProperties();
      // Exclude rentals in mock data
      allProps = allProps.filter((p) => p.LeaseConsideredYN !== true);

      if (top && top < allProps.length) {
        allProps = allProps.slice(0, top);
      }

      console.log("[ParagonApiClient.getAllPropertyWithMedia] => about to geocode mock data...");
      const geocoded = await geocodeProperties(allProps);

      const final = await this.populatePropertyMedia(geocoded, limit);
      return final;
    }

    if (this.__limitToTwenty) {
      console.log("[ParagonApiClient.getAllPropertyWithMedia] => limitToTwenty => forcing top=50.");
      top = 50;
    }

    const properties: ParagonPropertyWithMedia[] = await this.getAllProperty(top);
    console.log(
      "[ParagonApiClient.getAllPropertyWithMedia] => Got",
      properties.length,
      "properties. Next: media & geocode..."
    );

    const [withMedia, withGeocoding] = await Promise.all([
      this.populatePropertyMedia(properties, limit),
      geocodeProperties(properties),
    ]);

    // Merge geocode results back in
    const final = withMedia.map((property, index) => {
      property.Latitude = withGeocoding[index].Latitude;
      property.Longitude = withGeocoding[index].Longitude;
      return property;
    });

    console.log("[ParagonApiClient.getAllPropertyWithMedia] => Done => final length:", final.length);
    return final;
  }

  // =================================================================
  //                    NEW DEBUG METHODS (Raw Data)
  // =================================================================
  // These 3 methods skip the typical filters (StandardStatus, etc.).
  // They fetch minimal raw data for the zip/city so you can see
  // exactly what is returned by the OData feed.
  // Just return the raw .value array from each response.

  // Example: debug for zip=53713
  public async debugRawZip53713(): Promise<any[]> {
    console.log("[ParagonApiClient.debugRawZip53713] => Doing minimal fetch for zip=53713");
    // Ensure token
    await this.forClientSecret();

    // No standard status filter, just contains(PostalCode, '53713')
    // Return top=50
    const url = `${this.__baseUrl}/Property?$top=50&$count=true&$filter=contains(PostalCode, '53713')`;
    console.log("[ParagonApiClient.debugRawZip53713] => Fetching =>", url);

    const resp = await this.get<any>(url);
    console.log("[ParagonApiClient.debugRawZip53713] => items returned =>", resp.value.length);
    // Return raw property objects
    return resp.value;
  }

  // Example: debug for city=Madison
  public async debugRawCityMadison(): Promise<any[]> {
    console.log("[ParagonApiClient.debugRawCityMadison] => Doing minimal fetch for city=Madison");
    await this.forClientSecret();

    const url = `${this.__baseUrl}/Property?$top=50&$count=true&$filter=contains(City, 'Madison')`;
    console.log("[ParagonApiClient.debugRawCityMadison] => Fetching =>", url);

    const resp = await this.get<any>(url);
    console.log("[ParagonApiClient.debugRawCityMadison] => items returned =>", resp.value.length);
    return resp.value;
  }

  // Example: debug for zip=53703
  public async debugRawZip53703(): Promise<any[]> {
    console.log("[ParagonApiClient.debugRawZip53703] => Doing minimal fetch for zip=53703");
    await this.forClientSecret();

    const url = `${this.__baseUrl}/Property?$top=50&$count=true&$filter=contains(PostalCode, '53703')`;
    console.log("[ParagonApiClient.debugRawZip53703] => Fetching =>", url);

    const resp = await this.get<any>(url);
    console.log("[ParagonApiClient.debugRawZip53703] => items returned =>", resp.value.length);
    return resp.value;
  }
}

// Env config
const RESO_BASE_URL = process.env.RESO_BASE_URL ?? "";
const RESO_TOKEN_URL = process.env.RESO_TOKEN_URL ?? "";
const RESO_CLIENT_ID = process.env.RESO_CLIENT_ID ?? "";
const RESO_CLIENT_SECRET = process.env.RESO_CLIENT_SECRET ?? "";

// CHANGED => set false if you want no limit. If you keep true => 
// it only attaches media to the first 3 or so. 
const paragonApiClient = new ParagonApiClient(
  RESO_BASE_URL,
  RESO_TOKEN_URL,
  RESO_CLIENT_ID,
  RESO_CLIENT_SECRET,
  false // CHANGED => no slicing of media
);

export default paragonApiClient;
