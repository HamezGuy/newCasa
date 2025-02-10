// src/lib/ParagonApiClientTest.ts
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

// Use mock data if desired
const MOCK_DATA = process.env.MOCK_DATA === "true";

// Lazy-load the properties from your dummy data file
let mockDataCache: IParagonProperty[] = [];
function getMockProperties(): IParagonProperty[] {
  if (mockDataCache.length === 0) {
    const data = require("../../data/properties.json");
    // Expecting the JSON to have a "value" property that contains the array.
    mockDataCache = data.value || data;
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

export class ParagonApiClientTest {
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
    limitToTwenty = false // For testing, set to false so no slicing occurs.
  ) {
    console.log("[ParagonApiClientTest.constructor] Initializing with baseUrl:", baseUrl);
    this.__baseUrl = baseUrl;
    this.__tokenUrl = tokenUrl;
    this.__clientId = clientId;
    this.__clientSecret = clientSecret;
    this.__zipCodes = zipCodes;
    this.__limitToTwenty = limitToTwenty;
    console.log("[ParagonApiClientTest.constructor] zipCodes:", this.__zipCodes);
    console.log("[ParagonApiClientTest.constructor] limitToTwenty:", limitToTwenty);
  }

  // -----------------------------
  // Token initialization logic
  // -----------------------------
  public async initializeToken(): Promise<void> {
    console.log("[ParagonApiClientTest.initializeToken] Checking for token file...");
    if (typeof window === "undefined") {
      const fs = await import("fs/promises");
      const filepath = path.join(process.cwd(), `tokens/.token${md5(this.__clientId)}`);
      console.log("[ParagonApiClientTest.initializeToken] Token file path:", filepath);
      try {
        const data = await fs.readFile(filepath);
        const token = JSON.parse(data.toString()) as ILocalToken;
        this.__accessToken = token.token;
        this.__tokenExpiration = new Date(token.tokenExpiration);
        console.log("[ParagonApiClientTest.initializeToken] Loaded token; expires on:", this.__tokenExpiration);
      } catch (err) {
        console.log("[ParagonApiClientTest.initializeToken] Token file not found or unreadable:", err);
      }
    } else {
      console.log("[ParagonApiClientTest.initializeToken] Called in browser; skipping token logic.");
    }
  }

  public async saveToken(token: string, expiration: Date): Promise<void> {
    console.log("[ParagonApiClientTest.saveToken] Saving token with expiration:", expiration);
    if (typeof window === "undefined") {
      const fs = await import("fs/promises");
      const dirpath = path.join(process.cwd(), `tokens`);
      const filepath = path.join(dirpath, `/.token${md5(this.__clientId)}`);
      try {
        await fs.mkdir(dirpath, { recursive: true });
        await fs.writeFile(filepath, JSON.stringify({ token, tokenExpiration: expiration }));
        console.log("[ParagonApiClientTest.saveToken] Token saved at:", filepath);
      } catch (err) {
        console.error("[ParagonApiClientTest.saveToken] Error saving token file:", err);
      }
    } else {
      console.log("[ParagonApiClientTest.saveToken] Running in browser; skipping file write.");
    }
  }

  public async forClientSecret(): Promise<ParagonApiClientTest> {
    if (MOCK_DATA) return this;
    console.log("[ParagonApiClientTest.forClientSecret] Checking token validity...");
    if (this.__accessToken && this.__tokenExpiration && new Date() < this.__tokenExpiration) {
      console.log("[ParagonApiClientTest.forClientSecret] Existing token is valid.");
      return this;
    }
    console.log("[ParagonApiClientTest.forClientSecret] Token expired or missing; requesting new token...");
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
    console.log("[ParagonApiClientTest.forClientSecret] Fetching token from:", this.__tokenUrl);
    const response = await fetch(this.__tokenUrl, options);
    const tokenResponse = (await response.json()) as ITokenResponse;
    console.log("[ParagonApiClientTest.forClientSecret] Token response:", tokenResponse);
    this.__accessToken = tokenResponse.access_token;
    this.__tokenExpiration = new Date(new Date().getTime() + tokenResponse.expires_in * 1000);
    await this.saveToken(this.__accessToken, this.__tokenExpiration);
    console.log("[ParagonApiClientTest.forClientSecret] New token acquired; expires on:", this.__tokenExpiration);
    return this;
  }

  private async __getAuthHeaderValue(): Promise<string> {
    console.log("[ParagonApiClientTest.__getAuthHeaderValue] Ensuring valid token...");
    await this.forClientSecret();
    return `Bearer ${this.__accessToken}`;
  }

  // -----------------------------
  // GET Helpers
  // -----------------------------
  private async get<T>(url: string): Promise<IOdataResponse<T>> {
    if (MOCK_DATA) {
      return { "@odata.context": "mockData", value: [] as T[] };
    }
    console.log(`[ParagonApiClientTest.get] Fetching URL: ${url}`);
    const headers: HeadersInit = { Authorization: await this.__getAuthHeaderValue() };
    const options: RequestInit = { method: "GET", headers };
    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (fetchError: any) {
      console.error("[ParagonApiClientTest.get] Fetch error:", fetchError);
      throw new Error(`Fetch to ${url} failed: ${fetchError}`);
    }
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ParagonApiClientTest.get] HTTP ${response.status}: ${errorText}`);
      throw new Error(`Failed to fetch from ${url}, status: ${response.status}`);
    }
    try {
      return await response.json() as IOdataResponse<T>;
    } catch (parseError: any) {
      const rawText = await response.text();
      console.error("[ParagonApiClientTest.get] JSON parse error:", parseError, "Raw response:", rawText);
      throw new Error(`Response from ${url} is invalid JSON`);
    }
  }

  private async getFollowNext<T>(url: string): Promise<IOdataResponse<T>> {
    console.log("[ParagonApiClientTest.getFollowNext] Checking for nextLink from URL:", url);
    const response = await this.get<T>(url);
    if (response["@odata.nextLink"]) {
      const nextLink = response["@odata.nextLink"];
      console.log("[ParagonApiClientTest.getFollowNext] Found nextLink; fetching from:", nextLink);
      const additional = await this.getFollowNext<T>(nextLink);
      response.value = response.value.concat(additional.value);
      delete response["@odata.nextLink"];
    } else {
      console.log("[ParagonApiClientTest.getFollowNext] No nextLink found. Items so far:", response.value.length);
    }
    return response;
  }

  // -----------------------------
  // URL Helpers
  // -----------------------------
  private getRealtorFilters(): string {
    console.log("[ParagonApiClientTest.getRealtorFilters] Building filters from zipCodes:", this.__zipCodes);
    if (!this.__zipCodes || this.__zipCodes.length === 0) return "";
    return this.__zipCodes.map((zipCode) => `PostalCode eq '${zipCode}'`).join(" or ");
  }

  private getPropertyUrl(top: number, skip?: number): string {
    const realtorFilters = this.getRealtorFilters();
    let filterStr = `StandardStatus eq 'Active' and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)`;
    if (realtorFilters) filterStr += ` and (${realtorFilters})`;
    const topStr = top ? `&$top=${top}` : "";
    const skipStr = skip ? `&$skip=${skip}` : "";
    const finalUrl = `${this.__baseUrl}/Property?$count=true&$filter=${filterStr}${topStr}${skipStr}`;
    console.log("[ParagonApiClientTest.getPropertyUrl] Final URL:", finalUrl);
    return finalUrl;
  }

  private getMediaUrl(top: number, skip?: number, filter?: string): string {
    const params = new URLSearchParams();
    params.append("$top", top.toString());
    if (skip) params.append("$skip", skip.toString());
    if (filter) params.append("$filter", filter);
    const finalUrl = `${this.__baseUrl}/Media?$select=MediaKey,MediaURL,Order,ResourceRecordKey,ModificationTimestamp&$count=true&${params.toString()}`;
    console.log("[ParagonApiClientTest.getMediaUrl] Final media URL:", finalUrl);
    return finalUrl;
  }

  private generateMediaFilters(listingKeys: string[]): string[] {
    console.log("[ParagonApiClientTest.generateMediaFilters] Received listingKeys count:", listingKeys.length);
    const baseURL = this.getMediaUrl(9999999, 9999999, "1");
    const maxURLLength = 2048;
    let mediaFilters: string[] = [];
    let accFilter = "";
    const getEncodedLength = (str: string) => url.format(url.parse(str, true)).length;
    const generateFilter = (id: string, isFirst: boolean) => (isFirst ? "" : " or ") + `ResourceRecordKey eq '${id}'`;
    const pushNewFilter = (filter: string) => { if (filter !== "") mediaFilters.push(filter); };
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
    console.log("[ParagonApiClientTest.generateMediaFilters] Generated", mediaFilters.length, "filter chunks for listingKeys.");
    return mediaFilters;
  }

  // -----------------------------
  // Populate Media
  // -----------------------------
  public async populatePropertyMedia(
    properties: ParagonPropertyWithMedia[],
    limit: number = 0
  ): Promise<ParagonPropertyWithMedia[]> {
    console.log("[ParagonApiClientTest.populatePropertyMedia] Called with properties.length =", properties.length);
    if (properties.length === 0) return [];
    if (MOCK_DATA) {
      console.log("[ParagonApiClientTest.populatePropertyMedia] In mock mode; skipping media fetching logic.");
      return properties;
    }
    const mediaByProperty: Record<string, IParagonMedia[]> = {};
    const listingKeys = properties.map((p) => p.ListingKey!);
    console.log("[ParagonApiClientTest.populatePropertyMedia] Listing keys total:", listingKeys.length);
    let queryFilters = this.generateMediaFilters(listingKeys);
    console.log("[ParagonApiClientTest.populatePropertyMedia] queryFilters count:", queryFilters.length);
    await pMap(
      queryFilters,
      async (queryFilter: string) => {
        console.log("[ParagonApiClientTest.populatePropertyMedia] Using filter chunk:", queryFilter);
        const mediaUrl = this.getMediaUrl(this.__maxPageSize, undefined, queryFilter);
        console.log("[ParagonApiClientTest.populatePropertyMedia] getMediaUrl =>", mediaUrl);
        const mediaResponse = await this.get<IParagonMedia>(mediaUrl);
        const count = mediaResponse["@odata.count"] || 0;
        console.log(`[ParagonApiClientTest.populatePropertyMedia] Received ${mediaResponse.value.length} feed items, count=${count}`);
        if (count > this.__maxPageSize) {
          console.log("[ParagonApiClientTest.populatePropertyMedia] count exceeds maxPageSize => fetching nextLink...");
          const additional = await this.getFollowNext<IParagonMedia>(
            this.getMediaUrl(count, this.__maxPageSize, queryFilter)
          );
          mediaResponse.value = mediaResponse.value.concat(additional.value);
        }
        mediaResponse.value.forEach((m) => {
          if (!m.MediaURL) return;
          if (!mediaByProperty[m.ResourceRecordKey]) {
            mediaByProperty[m.ResourceRecordKey] = [m];
          } else {
            mediaByProperty[m.ResourceRecordKey].push(m);
          }
        });
      },
      { concurrency: this.__maxConcurrentQueries }
    );
    const finalList = this.__limitToTwenty ? properties.slice(0, limit || 3) : properties;
    console.log("[ParagonApiClientTest.populatePropertyMedia] limit scenario => finalList.length:", finalList.length);
    await pMap(
      finalList,
      async (property: ParagonPropertyWithMedia) => {
        const listingKey = property.ListingKey;
        let feedMedia = mediaByProperty[listingKey] || [];
        if (!feedMedia.length) {
          console.log(`[ParagonApiClientTest.populatePropertyMedia] No media found for listingKey=${listingKey}`);
          return;
        }
        const uniqueMap = new Map<number, IParagonMedia>();
        feedMedia.forEach((m) => uniqueMap.set(m.MediaKey, m));
        feedMedia = Array.from(uniqueMap.values()).sort((a, b) => (a.Order ?? 99999) - (b.Order ?? 99999));
        property.Media = feedMedia;
        console.log(`[ParagonApiClientTest.populatePropertyMedia] Attached feedMedia to property ${listingKey}; Count=`, feedMedia.length);
      },
      { concurrency: 5 }
    );
    console.log("[ParagonApiClientTest.populatePropertyMedia] Finished attaching feed media to all properties.");
    return properties;
  }

  // -----------------------------
  // GET Single Property By ID
  // -----------------------------
  public async getPropertyById(
    id: string,
    includeMedia: boolean = true
  ): Promise<IParagonProperty> {
    console.log(`[ParagonApiClientTest.getPropertyById] Called with id=${id}, includeMedia=${includeMedia}`);
    if (MOCK_DATA) {
      console.log("[ParagonApiClientTest.getPropertyById] Using mock data mode for ID:", id);
      const allProps = getMockProperties();
      const found = allProps.filter((p) => p.ListingId === id && p.LeaseConsideredYN !== true);
      console.log(`[ParagonApiClientTest.getPropertyById] Found ${found.length} in mock data. Geocoding...`);
      const geocoded = await geocodeProperties(found);
      return geocoded[0] || null;
    }
    const propertyUrl = `${this.__baseUrl}/Property?$filter=ListingId eq '${id}'`;
    console.log("[ParagonApiClientTest.getPropertyById] Will fetch property from:", propertyUrl);
    const response = await this.get<ParagonPropertyWithMedia>(propertyUrl);
    console.log("[ParagonApiClientTest.getPropertyById] fetch success => items:", response.value.length);
    const property = response.value[0] || null;
    if (!property || !includeMedia) {
      console.log("[ParagonApiClientTest.getPropertyById] No property found or media excluded.");
      return property;
    }
    try {
      const listingKey = property.ListingKey;
      if (!listingKey) {
        console.warn("[ParagonApiClientTest.getPropertyById] No ListingKey => skipping media fetch.");
        return property;
      }
      const mediaUrl = this.getMediaUrl(9999, 0, `ResourceRecordKey eq '${listingKey}'`);
      console.log("[ParagonApiClientTest.getPropertyById] Will fetch media from:", mediaUrl);
      const mediaResponse = await this.get<IParagonMedia>(mediaUrl);
      let feedMedia = mediaResponse.value || [];
      console.log("[ParagonApiClientTest.getPropertyById] Found media count:", feedMedia.length);
      feedMedia = feedMedia
        .filter((m) => !!m.MediaURL)
        .reduce((acc: IParagonMedia[], item) => {
          if (!acc.find((x) => x.MediaKey === item.MediaKey)) acc.push(item);
          return acc;
        }, [])
        .sort((a, b) => (a.Order ?? 99999) - (b.Order ?? 99999));
      property.Media = feedMedia;
      console.log("[ParagonApiClientTest.getPropertyById] Attached sorted media => count:", feedMedia.length);
    } catch (err) {
      console.error("[ParagonApiClientTest.getPropertyById] Media fetch error:", err);
    }
    return property;
  }

  // -----------------------------
  // GET By ZIP (using equality instead of contains)
  // -----------------------------
  public async searchByZipCode(
    zipCode: string,
    includeMedia: boolean = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log(`[ParagonApiClientTest.searchByZipCode] zipCode=${zipCode}, includeMedia=${includeMedia}`);
    if (MOCK_DATA) {
      console.log("[ParagonApiClientTest.searchByZipCode] Using mock data, filtering by zip code...");
      const allProps = getMockProperties();
      const filtered = allProps.filter(
        (p) => p.PostalCode === zipCode && p.LeaseConsideredYN !== true
      );
      const geocoded = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockDataZipCode", value: geocoded };
      }
      const withMedia = await this.populatePropertyMedia(geocoded);
      return { "@odata.context": "mockDataZipCode", value: withMedia };
    }
    const encodedZipCode = encodeURIComponent(zipCode);
    let url = `${this.__baseUrl}/Property?$count=true
      &$filter=StandardStatus eq 'Active'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)
      and PostalCode eq '${encodedZipCode}'`;
    if (this.__limitToTwenty) url += `&$top=50`;
    console.log("[ParagonApiClientTest.searchByZipCode] Final URL:", url);
    const response = await this.get<ParagonPropertyWithMedia>(url);
    console.log("[ParagonApiClientTest.searchByZipCode] fetch success => items:", response.value.length);
    if (response.value && includeMedia && response.value.length > 0) {
      console.log("[ParagonApiClientTest.searchByZipCode] populating media for properties...");
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
    console.log(`[ParagonApiClientTest.searchByStreetName] streetName=${streetName}, includeMedia=${includeMedia}`);
    if (MOCK_DATA) {
      console.log("[ParagonApiClientTest.searchByStreetName] Using mock data; filtering by street name...");
      const allProps = getMockProperties();
      const lower = streetName.toLowerCase();
      const filtered = allProps.filter(
        (p) => p.StreetName?.toLowerCase().includes(lower) && p.LeaseConsideredYN !== true
      );
      const geocoded = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockDataStreetName", value: geocoded };
      }
      const withMedia = await this.populatePropertyMedia(geocoded);
      return { "@odata.context": "mockDataStreetName", value: withMedia };
    }
    if (this.__limitToTwenty) console.log("[ParagonApiClientTest.searchByStreetName] limitToTwenty => &$top=50");
    const encodedStreet = encodeURIComponent(streetName);
    let url = `${this.__baseUrl}/Property?$count=true
      &$filter=StandardStatus eq 'Active'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)
      and contains(StreetName, '${encodedStreet}')`;
    if (this.__limitToTwenty) url += `&$top=50`;
    console.log("[ParagonApiClientTest.searchByStreetName] Final URL:", url);
    const response = await this.get<ParagonPropertyWithMedia>(url);
    console.log("[ParagonApiClientTest.searchByStreetName] fetch success => items:", response.value.length);
    if (response.value && includeMedia && response.value.length > 0) {
      console.log("[ParagonApiClientTest.searchByStreetName] populating media for properties...");
      response.value = await this.populatePropertyMedia(response.value);
    }
    return response;
  }

  // -----------------------------
  // GET By City
  // -----------------------------
  public async searchByCity(
    city: string,
    includeMedia: boolean = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log(`[ParagonApiClientTest.searchByCity] city=${city}, includeMedia=${includeMedia}`);
    if (MOCK_DATA) {
      console.log("[ParagonApiClientTest.searchByCity] Using mock data; filtering by city...");
      const allProps = getMockProperties();
      const lower = city.toLowerCase();
      const filtered = allProps.filter(
        (p) => p.City?.toLowerCase().includes(lower) && p.LeaseConsideredYN !== true
      );
      const geocoded = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockDataCity", value: geocoded };
      }
      const withMedia = await this.populatePropertyMedia(geocoded);
      return { "@odata.context": "mockDataCity", value: withMedia };
    }
    if (this.__limitToTwenty) console.log("[ParagonApiClientTest.searchByCity] limitToTwenty => &$top=50");
    const encodedCity = encodeURIComponent(city);
    let url = `${this.__baseUrl}/Property?$count=true
      &$filter=StandardStatus eq 'Active'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)
      and contains(City, '${encodedCity}')`;
    if (this.__limitToTwenty) url += `&$top=50`;
    console.log("[ParagonApiClientTest.searchByCity] Final URL:", url);
    const response = await this.get<ParagonPropertyWithMedia>(url);
    console.log("[ParagonApiClientTest.searchByCity] fetch success => items:", response.value.length);
    if (response.value && includeMedia && response.value.length > 0) {
      console.log("[ParagonApiClientTest.searchByCity] populating media for properties...");
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
    console.log(`[ParagonApiClientTest.searchByCounty] county=${county}, includeMedia=${includeMedia}`);
    if (MOCK_DATA) {
      console.log("[ParagonApiClientTest.searchByCounty] Using mock data; filtering by county...");
      const allProps = getMockProperties();
      const lower = county.toLowerCase();
      const filtered = allProps.filter(
        (p) => p.CountyOrParish?.toLowerCase().includes(lower) && p.LeaseConsideredYN !== true
      );
      const geocoded = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockDataCounty", value: geocoded };
      }
      const withMedia = await this.populatePropertyMedia(geocoded);
      return { "@odata.context": "mockDataCounty", value: withMedia };
    }
    if (this.__limitToTwenty) console.log("[ParagonApiClientTest.searchByCounty] limitToTwenty => &$top=50");
    const encodedCounty = encodeURIComponent(county);
    let url = `${this.__baseUrl}/Property?$count=true
      &$filter=StandardStatus eq 'Active'
      and (LeaseConsideredYN eq false or LeaseConsideredYN eq null)
      and contains(CountyOrParish, '${encodedCounty}')`;
    if (this.__limitToTwenty) url += `&$top=50`;
    console.log("[ParagonApiClientTest.searchByCounty] Final URL:", url);
    const response = await this.get<ParagonPropertyWithMedia>(url);
    console.log("[ParagonApiClientTest.searchByCounty] fetch success => items:", response.value.length);
    if (response.value && includeMedia && response.value.length > 0) {
      console.log("[ParagonApiClientTest.searchByCounty] populating media for properties...");
      response.value = await this.populatePropertyMedia(response.value);
    }
    return response;
  }

  // -----------------------------
  // NEW: GET All Properties (without media population)
  // -----------------------------
  public async getAllProperty(top?: number): Promise<IParagonProperty[]> {
    console.log(`[ParagonApiClientTest.getAllProperty] Called with top=${top}`);
    if (MOCK_DATA) {
      console.log("[ParagonApiClientTest.getAllProperty] Using mock data; returning entire file.");
      let allProps = getMockProperties();
      allProps = allProps.filter((p) => p.LeaseConsideredYN !== true);
      if (top && top < allProps.length) {
        allProps = allProps.slice(0, top);
      }
      const geocoded = await geocodeProperties(allProps);
      return geocoded;
    }
    if (this.__limitToTwenty) {
      console.log("[ParagonApiClientTest.getAllProperty] limitToTwenty => forcing top=50.");
      top = 50;
    }
    const finalUrl = this.getPropertyUrl(top ? top : this.__maxPageSize);
    console.log("[ParagonApiClientTest.getAllProperty] Will fetch from:", finalUrl);
    const response = await this.get<IParagonProperty>(finalUrl);
    console.log("[ParagonApiClientTest.getAllProperty] fetch success => items:", response.value.length);
    return response.value;
  }

  // -----------------------------
  // GET All Properties With Media
  // -----------------------------
  public async getAllPropertyWithMedia(top?: number, limit: number = 0): Promise<IParagonProperty[]> {
    console.log("[ParagonApiClientTest.getAllPropertyWithMedia] Called with top=", top, "limit=", limit);
    if (MOCK_DATA) {
      console.log("[ParagonApiClientTest.getAllPropertyWithMedia] Using mock data for everything");
      let allProps = getMockProperties();
      allProps = allProps.filter((p) => p.LeaseConsideredYN !== true);
      if (top && top < allProps.length) allProps = allProps.slice(0, top);
      console.log("[ParagonApiClientTest.getAllPropertyWithMedia] about to geocode mock data...");
      const geocoded = await geocodeProperties(allProps);
      const final = await this.populatePropertyMedia(geocoded, limit);
      return final;
    }
    if (this.__limitToTwenty) {
      console.log("[ParagonApiClientTest.getAllPropertyWithMedia] limitToTwenty => forcing top=50.");
      top = 50;
    }
    const properties: ParagonPropertyWithMedia[] = await this.getAllProperty(top);
    console.log("[ParagonApiClientTest.getAllPropertyWithMedia] Got", properties.length, "properties. Next: media & geocode...");
    const [withMedia, withGeocoding] = await Promise.all([
      this.populatePropertyMedia(properties, limit),
      geocodeProperties(properties),
    ]);
    const final = withMedia.map((property, index) => {
      property.Latitude = withGeocoding[index].Latitude;
      property.Longitude = withGeocoding[index].Longitude;
      return property;
    });
    console.log("[ParagonApiClientTest.getAllPropertyWithMedia] Done; final length:", final.length);
    return final;
  }
}

// Env config
const RESO_BASE_URL = process.env.RESO_BASE_URL ?? "";
const RESO_TOKEN_URL = process.env.RESO_TOKEN_URL ?? "";
const RESO_CLIENT_ID = process.env.RESO_CLIENT_ID ?? "";
const RESO_CLIENT_SECRET = process.env.RESO_CLIENT_SECRET ?? "";

const paragonApiClientTest = new ParagonApiClientTest(
  RESO_BASE_URL,
  RESO_TOKEN_URL,
  RESO_CLIENT_ID,
  RESO_CLIENT_SECRET,
  false
);

export default paragonApiClientTest;
