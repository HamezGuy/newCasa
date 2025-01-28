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
    limitToTwenty = false
  ) {
    console.log("[ParagonApiClient.constructor] => Initializing client with baseUrl:", baseUrl);
    this.__baseUrl = baseUrl;
    this.__tokenUrl = tokenUrl;
    this.__clientId = clientId;
    this.__clientSecret = clientSecret;
    this.__zipCodes = zipCodes; // still storing from config
    this.__limitToTwenty = limitToTwenty;

    // Logging as before
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

  // COMMENTED OUT => no longer needed for default zip code filtering
  // private getRealtorFilters(): string {
  //   console.log("[ParagonApiClient.getRealtorFilters] => Building filters from zipCodes:", this.__zipCodes);
  //   return this.__zipCodes.map((zipCode) => `PostalCode eq '${zipCode}'`).join(" or ");
  // }

  // CHANGED => Removed reference to getRealtorFilters() & zip code filter
  private getPropertyUrl(top: number, skip?: number): string {
    console.log(`[ParagonApiClient.getPropertyUrl] => Building property URL with top=${top}, skip=${skip}`);

    // Now we only exclude rentals and require StandardStatus eq 'Active'
    // (no default ZIP code filter)
    const filterStr = `$filter=StandardStatus eq 'Active' and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)`;

    const topStr = top ? `&$top=${top}` : "";
    const skipStr = skip ? `&$skip=${skip}` : "";

    const finalUrl = `${this.__baseUrl}/Property?$count=true&${filterStr}${topStr}${skipStr}`;
    console.log("[ParagonApiClient.getPropertyUrl] => Final property URL:", finalUrl);
    return finalUrl;
  }

  private getMediaUrl(top: number, skip?: number, filter?: string): string {
    console.log(`[ParagonApiClient.getMediaUrl] => Building media URL with top=${top}, skip=${skip}, filter=${filter}`);
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
  // Populate Media (WITHOUT Cloudinary)
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

    // 1) Build up a dictionary from listingKey => array of media
    const mediaByProperty: Record<string, IParagonMedia[]> = {};
    const listingKeys = properties.map((p) => p.ListingKey!);
    console.log("[ParagonApiClient.populatePropertyMedia] => Listing keys total:", listingKeys.length);

    // Create filter chunks for the Media endpoint
    let queryFilters = this.generateMediaFilters(listingKeys);
    console.log("[ParagonApiClient.populatePropertyMedia] => queryFilters count:", queryFilters.length);

    // 2) Gather media from the feed
    await pMap(
      queryFilters,
      async (queryFilter: string) => {
        console.log("[ParagonApiClient.populatePropertyMedia] => Using filter chunk:", queryFilter);
        const mediaUrl = this.getMediaUrl(this.__maxPageSize, undefined, queryFilter);
        console.log("[ParagonApiClient.populatePropertyMedia] => getMediaUrl =>", mediaUrl);

        const mediaResponse = await this.get<IParagonMedia>(mediaUrl);
        const count = mediaResponse["@odata.count"];
        console.log(
          `[ParagonApiClient.populatePropertyMedia] => Received ${mediaResponse.value.length} feed items, count=${count}`
        );

        if (count && count > this.__maxPageSize) {
          console.log(
            "[ParagonApiClient.populatePropertyMedia] => count exceeds maxPageSize, fetching nextLink with count=",
            count
          );
          const additional = await this.getFollowNext<IParagonMedia>(
            this.getMediaUrl(count, this.__maxPageSize, queryFilter)
          );
          mediaResponse.value = mediaResponse.value.concat(additional.value);
        }

        // Accumulate media
        mediaResponse.value.forEach((m) => {
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

    // If limitToTwenty is true => we only apply media to the first 'limit' properties (or all if limit=0).
    const finalList = this.__limitToTwenty ? properties.slice(0, limit || 3) : properties;
    console.log("[ParagonApiClient.populatePropertyMedia] => limit scenario => finalList.length:", finalList.length);

    // 3) Attach feed media to each property
    await pMap(
      finalList,
      async (property: ParagonPropertyWithMedia) => {
        const listingKey = property.ListingKey;
        const feedMedia = mediaByProperty[listingKey] || [];

        if (!feedMedia || feedMedia.length === 0) {
          console.log(
            `[ParagonApiClient.populatePropertyMedia] => Property ${listingKey} has no associated feed media.`
          );
          return;
        }

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

    // If mock => filter in-memory
    if (MOCK_DATA) {
      console.log("[ParagonApiClient.getPropertyById] => Using mock data mode for ID:", id);
      const allProps = getMockProperties();
      // Filter by ID, exclude rentals if flagged via LeaseConsideredYN
      const found = allProps.filter(
        (p) => p.ListingId === id && p.LeaseConsideredYN !== true
      );
      console.log(`[ParagonApiClient.getPropertyById] => Found ${found.length} in mock data. Geocoding...`);

      const geocoded = await geocodeProperties(found);
      return geocoded[0] || null;
    }

    // Exclude rentals in single-property call
    const url = `${this.__baseUrl}/Property?$filter=ListingId eq '${id}'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)`;

    console.log("[ParagonApiClient.getPropertyById] => Will fetch from URL:", url);

    const response = await this.get<ParagonPropertyWithMedia>(url);
    console.log("[ParagonApiClient.getPropertyById] => fetch success => got items length:", response.value.length);

    if (response.value && includeMedia && response.value.length > 0) {
      console.log("[ParagonApiClient.getPropertyById] => about to populate media for property...");
      response.value = await this.populatePropertyMedia(response.value);
    }

    const firstItem = response.value[0] || null;
    console.log("[ParagonApiClient.getPropertyById] => returning first item or null:", firstItem?.ListingKey);
    return firstItem;
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

    // Exclude rentals
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
      console.log("[ParagonApiClient.searchByStreetName] => Using mock data, filtering by StreetName...");
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
      console.log("[ParagonApiClient.searchByStreetName] => limitToTwenty => using &$top=50.");
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
      // Exclude rentals in mock data if flagged
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
        console.log(
          "[ParagonApiClient.getAllProperty] => count is large, calling getFollowNext with count=",
          count
        );
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
      console.log("[ParagonApiClient.searchByCity] => limitToTwenty => forcing &$top=50.");
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
      console.log("[ParagonApiClient.searchByCounty] => limitToTwenty => forcing &$top=50.");
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
}

// Env config
const RESO_BASE_URL = process.env.RESO_BASE_URL ?? "";
const RESO_TOKEN_URL = process.env.RESO_TOKEN_URL ?? "";
const RESO_CLIENT_ID = process.env.RESO_CLIENT_ID ?? "";
const RESO_CLIENT_SECRET = process.env.RESO_CLIENT_SECRET ?? "";

// Pass `true` to enable forcibly limiting to 50 (in constructor's last arg)
const paragonApiClient = new ParagonApiClient(
  RESO_BASE_URL,
  RESO_TOKEN_URL,
  RESO_CLIENT_ID,
  RESO_CLIENT_SECRET,
  true
);

export default paragonApiClient;
