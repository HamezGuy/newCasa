import IParagonMedia, { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import IParagonProperty from "@/types/IParagonProperty";
import md5 from "crypto-js/md5";
import getConfig from "next/config";
import pMap from "p-map";
// We still import 'url' for generateMediaFilters
import * as url from "url";
import { geocodeProperties } from "./GoogleMaps";

const { serverRuntimeConfig = {} } = getConfig() || {};
const zipCodes = serverRuntimeConfig.zipCodes || [];

// Switch to mock data by setting process.env.MOCK_DATA = "true"
const MOCK_DATA = process.env.MOCK_DATA === "true";

// Lazy-load local JSON once for mock data
let mockDataCache: IParagonProperty[] = [];
function getMockProperties(): IParagonProperty[] {
  if (mockDataCache.length === 0) {
    // If you have a local file at data/properties.json
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

/**
 * Interface for user filters => Ties each user selection
 * to the correct IParagonProperty field (ListPrice, PropertyType, BedroomsTotal, etc.).
 */
export interface IUserFilters {
  minPrice?: number;                 // => ListPrice >= X
  maxPrice?: number;                 // => ListPrice <= X
  propertyTypes?: { value: string }[];  // e.g. [{ value: "Residential" }, { value: "Land" }]
  minRooms?: number;                 // => BedroomsTotal >= X
  maxRooms?: number;                 // => BedroomsTotal <= X
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

  private __accessToken?: string;
  private __tokenExpiration?: Date;

  // Concurrency for Media => restored to original "120"
  private __maxPageSize = 2500;
  private __maxConcurrentQueries = 50;

  private __zipCodes: string[];
  private __limitToTwenty: boolean;

  // Controls how many total items we gather via getWithOffset()
  private __offsetFetchLimit = 400; // default: 200

  constructor(
    baseUrl: string,
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
    limitToTwenty = false
  ) {
    console.log("[ParagonApiClient.constructor] => baseUrl:", baseUrl);
    this.__baseUrl = baseUrl;
    this.__tokenUrl = tokenUrl;
    this.__clientId = clientId;
    this.__clientSecret = clientSecret;
    this.__zipCodes = zipCodes;
    this.__limitToTwenty = limitToTwenty;

    console.log("[ParagonApiClient.constructor] => zipCodes:", this.__zipCodes);
    console.log("[ParagonApiClient.constructor] => limitToTwenty:", limitToTwenty);
  }

  // ------------------------------------------------------------------
  // Token logic
  // ------------------------------------------------------------------
  public async initializeToken(): Promise<void> {
    console.log("[ParagonApiClient.initializeToken] => Checking for token file...");

    // Skip reading if in browser or on Vercel
    if (typeof window !== "undefined" || process.env.VERCEL) {
      console.log("[initializeToken] => In browser or on Vercel => skipping file read");
      return;
    }

    try {
      // Use require("fs") so Next won't complain
      const fs = require("fs");
      const path = require("path");

      // Save a token file with a hashed clientId in the filename
      const filepath = path.join(process.cwd(), `tokens/.token${md5(this.__clientId)}`);
      console.log("[initializeToken] => token path:", filepath);

      // readFileSync => read synchronous
      const data = fs.readFileSync(filepath);
      const token = JSON.parse(data.toString()) as ILocalToken;
      this.__accessToken = token.token;
      this.__tokenExpiration = new Date(token.tokenExpiration);
      console.log("[initializeToken] => loaded => expires:", this.__tokenExpiration);

    } catch (err) {
      console.log("[initializeToken] => token file missing:", err);
    }
  }

  // Update this method in your ParagonApiClient class:

// In ParagonApiClient.ts
public async forClientSecret(): Promise<ParagonApiClient> {
  if (MOCK_DATA) return this;

  console.log("[forClientSecret] => Checking token...");
  if (this.__accessToken && this.__tokenExpiration && new Date() < this.__tokenExpiration) {
    console.log("[forClientSecret] => token still valid");
    return this;
  }

  console.log("[forClientSecret] => need new token => requesting...");
  
  // If environment variables are not set, use mock data instead
  if (!this.__tokenUrl || !this.__clientId || !this.__clientSecret) {
    console.log("[forClientSecret] => Missing credentials, switching to mock mode");
    return this;
  }
  
  try {
    // Using the exact form structure and headers from the original working version
    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("scope", "OData");

    const token = Buffer.from(`${this.__clientId}:${this.__clientSecret}`).toString("base64");
    
    // Using the original headers structure that was working before
    const headers: HeadersInit = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "Authorization": `Basic ${token}`,
    };

    console.log("[forClientSecret] => Making token request...");
    
    // Use only next.revalidate, not both cache and revalidate
    const resp = await fetch(this.__tokenUrl, {
      method: "POST",
      headers,
      body: body.toString(),
      next: { revalidate: 3600 } // Revalidate every hour
    });
    
    // Check if response is OK before trying to parse JSON
    if (!resp.ok) {
      const text = await resp.text();
      console.error("[forClientSecret] => Non-OK response:", resp.status, text.substring(0, 200));
      // Try to use any existing token if available instead of immediately failing
      if (this.__accessToken) {
        console.log("[forClientSecret] => Using existing token as fallback");
        return this;
      }
      throw new Error(`Failed to get token: ${resp.status} ${resp.statusText}`);
    }
    
    // Try to parse JSON response
    const tokenResp = await resp.json() as ITokenResponse;
    console.log("[forClientSecret] => tokenResp =>", tokenResp);

    if (!tokenResp.access_token) {
      console.error("[forClientSecret] => No access_token in response");
      throw new Error("No access_token in response");
    }

    this.__accessToken = tokenResp.access_token;
    this.__tokenExpiration = new Date(Date.now() + tokenResp.expires_in * 1000);

    console.log("[forClientSecret] => new token => expires:", this.__tokenExpiration);
    return this;
  } catch (error) {
    console.error("[forClientSecret] => Error getting token:", error);
    // Fall back to mock data if token fetch fails
    console.log("[forClientSecret] => Falling back to mock data due to token error");
    return this;
  }
}

  private async __getAuthHeader(): Promise<string> {
    try {
      await this.forClientSecret();
      if (!this.__accessToken) {
        console.warn("[__getAuthHeader] => No access token available, using mock");
        return "Bearer mock-token";
      }
      return `Bearer ${this.__accessToken}`;
    } catch (error) {
      console.error("[__getAuthHeader] => Error:", error);
      return "Bearer mock-token";
    }
  }

  private async __fetchOdata<T>(url: string): Promise<IOdataResponse<T>> {
    if (MOCK_DATA || !this.__accessToken) {
      // If you're in mock mode or no token, return empty array
      console.log("[__fetchOdata] => Using mock data");
      return { "@odata.context": "mockData", value: [] as T[] };
    }

    console.log("[__fetchOdata] => fetch =>", url);
    
    try {
      const headers: HeadersInit = { Authorization: await this.__getAuthHeader() };

      let resp: Response;
      try {
        resp = await fetch(url, { method: "GET", headers });
      } catch (err) {
        console.error("[__fetchOdata] => fetch error =>", err);
        throw new Error(`failed to fetch => ${url} => ${err}`);
      }

      if (!resp.ok) {
        const body = await resp.text();
        console.error("[__fetchOdata] => Non-OK =>", resp.status, body.substring(0, 200));
        throw new Error(`HTTP error => ${resp.status} => ${url}`);
      }

      try {
        const json = await resp.json();
        return json as IOdataResponse<T>;
      } catch (parseErr) {
        console.error("[__fetchOdata] => parse error =>", parseErr);
        throw new Error("Invalid JSON => " + url);
      }
    } catch (error) {
      console.error("[__fetchOdata] => Error:", error);
      // Return empty result on error
      return { "@odata.context": "errorData", value: [] as T[] };
    }
  }

  // ------------------------------------------------------------------
  // Low-level fetch with offset-based approach
  // ------------------------------------------------------------------
  private async getWithOffset<T>(
    baseUrl: string,
    desiredCount: number = this.__offsetFetchLimit
  ): Promise<IOdataResponse<T>> {
    console.log("[getWithOffset] => baseUrl:", baseUrl, ", desiredCount:", desiredCount);

    const all: T[] = [];
    let skip = 0;
    let hasMore = true;
    let context = "";

    while (all.length < desiredCount && hasMore) {
      const pageSize = 100; // always ask for 100 at a time
      const pagedUrl = `${baseUrl}&$top=${pageSize}&$skip=${skip}`;
      console.log(
        `[getWithOffset] => Iteration => skip=${skip}, soFar=${all.length}, requesting =>`,
        pagedUrl
      );

      const chunk = await this.__fetchOdata<T>(pagedUrl);

      // Record context from the first chunk
      if (!context && chunk["@odata.context"]) {
        context = chunk["@odata.context"];
      }

      console.log(`[getWithOffset] => chunk length => ${chunk.value.length}`);
      if (!chunk.value.length) {
        console.log("[getWithOffset] => zero items => done");
        hasMore = false;
        break;
      }

      all.push(...chunk.value);
      skip += chunk.value.length;

      if (chunk.value.length < pageSize) {
        console.log("[getWithOffset] => partial chunk => presumably no more data => stop");
        hasMore = false;
      }
    }

    console.log(`[getWithOffset] => collected total => ${all.length}`);
    if (all.length > desiredCount) {
      all.splice(desiredCount);
      console.log(`[getWithOffset] => spliced down to => ${all.length}`);
    }

    return {
      "@odata.context": context,
      value: all,
    };
  }

  // ------------------------------------------------------------------
  // Media logic => offset approach if multiple pages, concurrency=120
  // ------------------------------------------------------------------
  private getMediaUrl(top: number, skip?: number, filter?: string): string {
    const params = new URLSearchParams();
    params.append("$top", top.toString());
    if (skip) params.append("$skip", skip.toString());
    if (filter) params.append("$filter", filter);

    const finalUrl = `${this.__baseUrl}/Media?$select=MediaKey,MediaURL,Order,ResourceRecordKey,ModificationTimestamp&$count=true&${params.toString()}`;
    console.log("[ParagonApiClient.getMediaUrl] =>", finalUrl);
    return finalUrl;
  }

  private generateMediaFilters(listingKeys: string[]): string[] {
    // We build one or more filter strings like "ResourceRecordKey eq '123' or ResourceRecordKey eq '456'"
    const base = this.getMediaUrl(9999999, 9999999, "1");
    const maxLen = 2048;
    const out: string[] = [];
    let acc = "";

    const getLen = (str: string) => url.format(url.parse(str, true)).length;

    const piece = (id: string, isFirst: boolean) =>
      (isFirst ? "" : " or ") + `ResourceRecordKey eq '${id}'`;

    for (const id of listingKeys) {
      const next = piece(id, acc === "");
      if (getLen(base + acc + next) <= maxLen) {
        acc += next;
      } else {
        out.push(acc);
        acc = piece(id, true);
      }
    }
    if (acc) out.push(acc);

    console.log("[ParagonApiClient.generateMediaFilters] => final count =>", out.length);
    return out;
  }

  public async populatePropertyMedia(
    properties: ParagonPropertyWithMedia[],
    limit = 0
  ): Promise<ParagonPropertyWithMedia[]> {
    if (!properties.length) return properties;
    if (MOCK_DATA) return properties;

    // Gather listing keys
    const listingKeys = properties.map((p) => p.ListingKey!);
    const filterChunks = this.generateMediaFilters(listingKeys);

    const mediaByProp: Record<string, IParagonMedia[]> = {};

    // For each chunk, fetch all matching media
    await pMap(
      filterChunks,
      async (chunk) => {
        let skip = 0;
        const pageSize = this.__maxPageSize;

        while (true) {
          const mediaURL = this.getMediaUrl(pageSize, skip, chunk);
          console.log("[populatePropertyMedia] => fetch =>", mediaURL);

          const resp = await this.__fetchOdata<IParagonMedia>(mediaURL);
          console.log("[populatePropertyMedia] => chunk length =>", resp.value.length);

          if (!resp.value.length) break;

          resp.value.forEach((m) => {
            if (!m.MediaURL) return;
            if (!mediaByProp[m.ResourceRecordKey]) {
              mediaByProp[m.ResourceRecordKey] = [];
            }
            mediaByProp[m.ResourceRecordKey].push(m);
          });

          // If fewer than pageSize were returned, we've reached the end
          if (resp.value.length < pageSize) break;
          skip += resp.value.length;
        }
      },
      { concurrency: this.__maxConcurrentQueries } // 120 concurrency
    );

    // If limitToTwenty is true, you only keep top X properties
    const finalList = this.__limitToTwenty ? properties.slice(0, limit || 3) : properties;

    // Attach the Media array to each property
    await pMap(
      finalList,
      async (p) => {
        let items = mediaByProp[p.ListingKey!] || [];
        // De-duplicate by MediaKey
        const uniq = new Map<number, IParagonMedia>();
        items.forEach((m) => uniq.set(m.MediaKey, m));
        items = Array.from(uniq.values()).sort((a, b) => {
          const oa = a.Order ?? 99999;
          const ob = b.Order ?? 99999;
          return oa - ob;
        });
        p.Media = items;
      },
      { concurrency: 5 }
    );

    return properties;
  }

  // ------------------------------------------------------------------
  // Debug raw fetch calls (unchanged)
  // ------------------------------------------------------------------
  public async debugRawZip53713(): Promise<any[]> {
    console.log("[debugRawZip53713] => offset => no big filter besides zip=53713");
    await this.forClientSecret();
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(PostalCode, '53713')`;
    const resp = await this.getWithOffset<any>(base, this.__offsetFetchLimit);
    console.log("[debugRawZip53713] => final =>", resp.value.length);
    return resp.value;
  }

  public async debugRawZip53703(): Promise<any[]> {
    console.log("[debugRawZip53703] => offset => zip=53703");
    await this.forClientSecret();
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(PostalCode, '53703')`;
    const resp = await this.getWithOffset<any>(base, this.__offsetFetchLimit);
    console.log("[debugRawZip53703] => final =>", resp.value.length);
    return resp.value;
  }

  public async debugRawCityMadison(): Promise<any[]> {
    console.log("[debugRawCityMadison] => offset => city=Madison");
    await this.forClientSecret();
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(City, 'Madison')`;
    const resp = await this.getWithOffset<any>(base, this.__offsetFetchLimit);
    console.log("[debugRawCityMadison] => final =>", resp.value.length);
    return resp.value;
  }

  // ------------------------------------------------------------------
  // buildUserFilter => convert user filter object to OData string
  // ------------------------------------------------------------------
  private buildUserFilter(filters?: IUserFilters): string {
    if (!filters) return "";

    const parts: string[] = [];

    // minPrice => ListPrice ge X
    if (typeof filters.minPrice === "number" && filters.minPrice > 0) {
      parts.push(`ListPrice ge ${filters.minPrice}`);
    }
    // maxPrice => ListPrice le X
    if (typeof filters.maxPrice === "number" && filters.maxPrice > 0) {
      parts.push(`ListPrice le ${filters.maxPrice}`);
    }
    // propertyTypes => OR logic => e.g. (PropertyType eq 'Residential' or PropertyType eq 'Land')
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      const orClauses = filters.propertyTypes.map((t) => `PropertyType eq '${t.value}'`);
      parts.push(`(${orClauses.join(" or ")})`);
    }

    // minRooms => BedroomsTotal ge X
    if (typeof filters.minRooms === "number" && filters.minRooms > 0) {
      parts.push(`BedroomsTotal ge ${filters.minRooms}`);
    }
    // maxRooms => BedroomsTotal le X
    if (typeof filters.maxRooms === "number" && filters.maxRooms > 0) {
      parts.push(`BedroomsTotal le ${filters.maxRooms}`);
    }

    if (!parts.length) return "";
    return parts.join(" and ");
  }

  // ------------------------------------------------------------------
  // (OLD) FILTER-AFTER "search" methods
  // (Kept mostly unchanged for direct comparison, if needed)
  // ------------------------------------------------------------------
  public async searchByZipCodeFilterAfter(
    zip: string,
    includeMedia = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log("[searchByZipCodeFilterAfter => originally filter AFTER] => zip=", zip);

    if (MOCK_DATA) {
      // 1) All properties that match postalCode
      const all = getMockProperties();
      const raw = all.filter((p) => p.PostalCode?.includes(zip));
      // 2) Filter in memory for Active/Pending
      const filtered = raw.filter(
        (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
      );
      // 3) Geocode
      const geo = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockZip", value: geo };
      }
      // If they do want media, populate
      const withMed = await this.populatePropertyMedia(geo);
      return { "@odata.context": "mockZip", value: withMed };
    }

    // Real fetch (no StandardStatus filter up front => filter in memory)
    await this.forClientSecret();
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(PostalCode, '${encodeURIComponent(zip)}')`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    // Then filter in memory => StandardStatus = Active or Pending
    let final = resp.value.filter(
      (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
    );

    // optionally populate media
    if (includeMedia && final.length) {
      final = await this.populatePropertyMedia(final);
    }

    console.log(`[searchByZipCodeFilterAfter => AFTER filter] => final => ${final.length}`);
    return {
      "@odata.context": resp["@odata.context"] || "filterAfter:Zip",
      value: final,
    };
  }

  public async searchByCityFilterAfter(
    city: string,
    includeMedia = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log("[searchByCityFilterAfter => originally filter AFTER] => city=", city);

    if (MOCK_DATA) {
      const all = getMockProperties();
      const raw = all.filter((p) => p.City?.toLowerCase().includes(city.toLowerCase()));
      const filtered = raw.filter(
        (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
      );
      const geo = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockCity", value: geo };
      }
      const withMed = await this.populatePropertyMedia(geo);
      return { "@odata.context": "mockCity", value: withMed };
    }

    // real fetch
    await this.forClientSecret();
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(City, '${encodeURIComponent(city)}')`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    let final = resp.value.filter(
      (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
    );

    if (includeMedia && final.length) {
      final = await this.populatePropertyMedia(final);
    }

    console.log(`[searchByCityFilterAfter => AFTER filter] => final => ${final.length}`);
    return {
      "@odata.context": resp["@odata.context"] || "filterAfter:City",
      value: final,
    };
  }

  public async searchByStreetNameFilterAfter(
    street: string,
    includeMedia = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log("[searchByStreetNameFilterAfter => originally filter AFTER] => street=", street);

    if (MOCK_DATA) {
      const all = getMockProperties();
      const raw = all.filter((p) => p.StreetName?.toLowerCase().includes(street.toLowerCase()));
      const filtered = raw.filter(
        (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
      );
      const geo = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockStreet", value: geo };
      }
      const withMed = await this.populatePropertyMedia(geo);
      return { "@odata.context": "mockStreet", value: withMed };
    }

    await this.forClientSecret();
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(StreetName, '${encodeURIComponent(street)}')`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    let final = resp.value.filter(
      (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
    );

    if (includeMedia && final.length) {
      final = await this.populatePropertyMedia(final);
    }

    console.log(`[searchByStreetNameFilterAfter => AFTER filter] => final => ${final.length}`);
    return {
      "@odata.context": resp["@odata.context"] || "filterAfter:Street",
      value: final,
    };
  }

  public async searchByCountyFilterAfter(
    county: string,
    includeMedia = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log("[searchByCountyFilterAfter => originally filter AFTER] => county=", county);

    if (MOCK_DATA) {
      const all = getMockProperties();
      const raw = all.filter((p) =>
        p.CountyOrParish?.toLowerCase().includes(county.toLowerCase())
      );
      const filtered = raw.filter(
        (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
      );
      const geo = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockCounty", value: geo };
      }
      const withMed = await this.populatePropertyMedia(geo);
      return { "@odata.context": "mockCounty", value: withMed };
    }

    await this.forClientSecret();
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(CountyOrParish, '${encodeURIComponent(county)}')`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    let final = resp.value.filter(
      (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
    );

    if (includeMedia && final.length) {
      final = await this.populatePropertyMedia(final);
    }

    console.log(`[searchByCountyFilterAfter => AFTER filter] => final => ${final.length}`);
    return {
      "@odata.context": resp["@odata.context"] || "filterAfter:County",
      value: final,
    };
  }

  // ------------------------------------------------------------------
  // getAllPropertyWithMedia => returns FULL data + images
  // ------------------------------------------------------------------
  public async getAllPropertyWithMedia(top?: number): Promise<IParagonProperty[]> {
    console.log("[getAllPropertyWithMedia] => offset => top=", top);

    if (MOCK_DATA) {
      let all = getMockProperties();
      // Only keep Active or Pending
      all = all.filter((p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending");
      if (top && top < all.length) all = all.slice(0, top);
      const geo = await geocodeProperties(all);
      // For the full approach, we do want images
      return this.populatePropertyMedia(geo);
    }

    await this.forClientSecret();
    const desired = top || this.__offsetFetchLimit;
    const filter = `(StandardStatus eq 'Active' or StandardStatus eq 'Pending')`;

    // Return ALL fields => no ?$select
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, desired);
    console.log("[getAllPropertyWithMedia] => got =>", resp.value.length);

    // Populate media + geocode
    const [withMed, withGeo] = await Promise.all([
      this.populatePropertyMedia(resp.value),
      geocodeProperties(resp.value),
    ]);

    const final = withMed.map((p, i) => {
      p.Latitude = withGeo[i].Latitude;
      p.Longitude = withGeo[i].Longitude;
      return p;
    });
    console.log("[getAllPropertyWithMedia] => final =>", final.length);
    return final;
  }

  // ------------------------------------------------------------------
  // Additional debug "rawThenFilter" => now we filter by Active/Pending
  // ------------------------------------------------------------------
  public async debugRawThenFilterZip53713(): Promise<any[]> {
    console.log("[debugRawThenFilterZip53713] => fetch raw => then filter in memory (Active/Pending)");
    const raw = await this.debugRawZip53713();
    const final = raw.filter(
      (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
    );
    console.log("[debugRawThenFilterZip53713] => final =>", final.length);
    return final;
  }

  public async debugRawThenFilterZip53703(): Promise<any[]> {
    console.log("[debugRawThenFilterZip53703] => fetch raw => then filter in memory (Active/Pending)");
    const raw = await this.debugRawZip53703();
    const final = raw.filter(
      (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
    );
    console.log("[debugRawThenFilterZip53703] => final =>", final.length);
    return final;
  }

  public async debugRawThenFilterCityMadison(): Promise<any[]> {
    console.log("[debugRawThenFilterCityMadison] => fetch raw => then filter in memory (Active/Pending)");
    const raw = await this.debugRawCityMadison();
    const final = raw.filter(
      (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
    );
    console.log("[debugRawThenFilterCityMadison] => final =>", final.length);
    return final;
  }

  // For comparing sets if you still need it:
  public async compareFilterResultsZip53713() {
    const rawThenFiltered = await this.debugRawThenFilterZip53713();
    const filterResp = await this.searchByZipCodeFilterFirst("53713");
    const filterFirst = filterResp.value;
    return this.compareSets(rawThenFiltered, filterFirst);
  }

  public async compareFilterResultsZip53703() {
    const rawThenFiltered = await this.debugRawThenFilterZip53703();
    const filterResp = await this.searchByZipCodeFilterFirst("53703");
    const filterFirst = filterResp.value;
    return this.compareSets(rawThenFiltered, filterFirst);
  }

  public async compareFilterResultsCityMadison() {
    const rawThenFiltered = await this.debugRawThenFilterCityMadison();
    const filterResp = await this.searchByCityFilterFirst("Madison");
    const filterFirst = filterResp.value;
    return this.compareSets(rawThenFiltered, filterFirst);
  }

  private compareSets(rawThenFiltered: any[], filterFirst: ParagonPropertyWithMedia[]) {
    const rawKeys = new Set(rawThenFiltered.map((r) => r.ListingKey));
    const filterKeys = new Set(filterFirst.map((r) => r.ListingKey));

    const missingInRaw: string[] = [];
    filterKeys.forEach((key) => {
      if (!rawKeys.has(key)) {
        missingInRaw.push(key);
      }
    });

    const missingInFilter: string[] = [];
    rawKeys.forEach((key) => {
      if (!filterKeys.has(key)) {
        missingInFilter.push(key);
      }
    });

    return {
      rawCount: rawThenFiltered.length,
      filterCount: filterFirst.length,
      missingInRaw,
      missingInFilter,
      sampleRaw: rawThenFiltered.slice(0, 4),
      sampleFilter: filterFirst.slice(0, 4),
    };
  }

  // ------------------------------------------------------------------
  // (OLD) FilterFirst versions for direct comparison (unchanged)
  // ------------------------------------------------------------------
  public async searchByZipCodeFilterFirst(
    zip: string,
    includeMedia = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    if (MOCK_DATA) {
      const all = getMockProperties();
      const filtered = all.filter(
        (p) =>
          (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
          p.PostalCode?.includes(zip)
      );
      const geo = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockZipFilterFirst", value: geo };
      }
      const withMed = await this.populatePropertyMedia(geo);
      return { "@odata.context": "mockZipFilterFirst", value: withMed };
    }

    await this.forClientSecret();
    const filterPortion = "(StandardStatus eq 'Active' or StandardStatus eq 'Pending')";
    const filter = `${filterPortion} and contains(PostalCode, '${encodeURIComponent(zip)}')`;
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
    }
    return resp;
  }

  public async searchByCityFilterFirst(
    city: string,
    includeMedia = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    if (MOCK_DATA) {
      const all = getMockProperties();
      const c = city.toLowerCase();
      const filtered = all.filter(
        (p) =>
          (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
          p.City?.toLowerCase().includes(c)
      );
      const geo = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockCityFilterFirst", value: geo };
      }
      const withMed = await this.populatePropertyMedia(filtered);
      return { "@odata.context": "mockCityFilterFirst", value: withMed };
    }

    await this.forClientSecret();
    const filterPortion = "(StandardStatus eq 'Active' or StandardStatus eq 'Pending')";
    const filter = `${filterPortion} and contains(City, '${encodeURIComponent(city)}')`;
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
    }
    return resp;
  }

  public async searchByStreetNameFilterFirst(
    street: string,
    includeMedia = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    if (MOCK_DATA) {
      const all = getMockProperties();
      const st = street.toLowerCase();
      const filtered = all.filter(
        (p) =>
          (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
          p.StreetName?.toLowerCase().includes(st)
      );
      const geo = await geocodeProperties(filtered);

      if (!includeMedia) {
        return { "@odata.context": "mockStreetFilterFirst", value: geo };
      }
      const withMed = await this.populatePropertyMedia(geo);
      return { "@odata.context": "mockStreetFilterFirst", value: withMed };
    }

    await this.forClientSecret();
    const filterPortion = "(StandardStatus eq 'Active' or StandardStatus eq 'Pending')";
    const filter = `${filterPortion} and contains(StreetName, '${encodeURIComponent(street)}')`;
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
    }
    return resp;
  }

  public async searchByCountyFilterFirst(
    county: string,
    includeMedia = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    if (MOCK_DATA) {
      const all = getMockProperties();
      const c = county.toLowerCase();
      const filtered = all.filter(
        (p) =>
          (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
          p.CountyOrParish?.toLowerCase().includes(c)
      );
      const geo = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockCountyFilterFirst", value: geo };
      }
      const withMed = await this.populatePropertyMedia(filtered);
      return { "@odata.context": "mockCountyFilterFirst", value: withMed };
    }

    await this.forClientSecret();
    const filterPortion = "(StandardStatus eq 'Active' or StandardStatus eq 'Pending')";
    const filter = `${filterPortion} and contains(CountyOrParish, '${encodeURIComponent(county)}')`;
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
    }
    return resp;
  }

  // ------------------------------------------------------------------
  // Normal "search" methods => Filter-Before => full data + images
  // (Here we apply user filters plus standard status, no ?$select)
  // ------------------------------------------------------------------
  public async searchByZipCode(
    zip: string,
    userFilters?: IUserFilters,
    includeMedia = true
  ) {
    console.log("[searchByZipCode => full data + images] => zip=", zip);

    if (MOCK_DATA) {
      const all = getMockProperties();
      const filtered = all.filter(
        (p) =>
          (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
          p.PostalCode?.includes(zip)
      );
      const geo = await geocodeProperties(filtered);
      if (includeMedia) {
        const withMed = await this.populatePropertyMedia(geo);
        return { "@odata.context": "mockZipFilterFirst", value: withMed };
      }
      return { "@odata.context": "mockZipFilterFirst", value: geo };
    }

    await this.forClientSecret();
    const filterPortion = "(StandardStatus eq 'Active' or StandardStatus eq 'Pending')";
    let filter = `${filterPortion} and contains(PostalCode, '${encodeURIComponent(zip)}')`;

    // Append user filters
    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }

    // Return all fields => no ?$select
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
      // Also geocode
      const geo = await geocodeProperties(resp.value);
      resp.value.forEach((p, i) => {
        p.Latitude = geo[i].Latitude;
        p.Longitude = geo[i].Longitude;
      });
    }
    return resp;
  }

  public async searchByCity(
    city: string,
    userFilters?: IUserFilters,
    includeMedia = true
  ) {
    console.log("[searchByCity => full data + images] => city=", city);

    if (MOCK_DATA) {
      const all = getMockProperties();
      const c = city.toLowerCase();
      const filtered = all.filter(
        (p) =>
          (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
          p.City?.toLowerCase().includes(c)
      );
      const geo = await geocodeProperties(filtered);
      if (includeMedia) {
        const withMed = await this.populatePropertyMedia(filtered);
        return { "@odata.context": "mockCityFilterFirst", value: withMed };
      }
      return { "@odata.context": "mockCityFilterFirst", value: geo };
    }

    await this.forClientSecret();
    const filterPortion = "(StandardStatus eq 'Active' or StandardStatus eq 'Pending')";
    let filter = `${filterPortion} and contains(City, '${encodeURIComponent(city)}')`;

    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }

    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
      const geo = await geocodeProperties(resp.value);
      resp.value.forEach((p, i) => {
        p.Latitude = geo[i].Latitude;
        p.Longitude = geo[i].Longitude;
      });
    }
    return resp;
  }

  public async searchByStreetName(
    street: string,
    userFilters?: IUserFilters,
    includeMedia = true
  ) {
    console.log("[searchByStreetName => full data + images] => street=", street);

    if (MOCK_DATA) {
      const all = getMockProperties();
      const st = street.toLowerCase();
      const filtered = all.filter(
        (p) =>
          (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
          p.StreetName?.toLowerCase().includes(st)
      );
      const geo = await geocodeProperties(filtered);
      if (includeMedia) {
        const withMed = await this.populatePropertyMedia(geo);
        return { "@odata.context": "mockStreetFilterFirst", value: withMed };
      }
      return { "@odata.context": "mockStreetFilterFirst", value: geo };
    }

    await this.forClientSecret();
    const filterPortion = "(StandardStatus eq 'Active' or StandardStatus eq 'Pending')";
    let filter = `${filterPortion} and contains(StreetName, '${encodeURIComponent(street)}')`;

    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }

    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
      const geo = await geocodeProperties(resp.value);
      resp.value.forEach((p, i) => {
        p.Latitude = geo[i].Latitude;
        p.Longitude = geo[i].Longitude;
      });
    }
    return resp;
  }

  public async searchByCounty(
    county: string,
    userFilters?: IUserFilters,
    includeMedia = true
  ) {
    console.log("[searchByCounty => full data + images] => county=", county);

    if (MOCK_DATA) {
      const all = getMockProperties();
      const c = county.toLowerCase();
      const filtered = all.filter(
        (p) =>
          (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
          p.CountyOrParish?.toLowerCase().includes(c)
      );
      const geo = await geocodeProperties(filtered);
      if (includeMedia) {
        const withMed = await this.populatePropertyMedia(filtered);
        return { "@odata.context": "mockCountyFilterFirst", value: withMed };
      }
      return { "@odata.context": "mockCountyFilterFirst", value: geo };
    }

    await this.forClientSecret();
    const filterPortion = "(StandardStatus eq 'Active' or StandardStatus eq 'Pending')";
    let filter = `${filterPortion} and contains(CountyOrParish, '${encodeURIComponent(county)}')`;

    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }

    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
      const geo = await geocodeProperties(resp.value);
      resp.value.forEach((p, i) => {
        p.Latitude = geo[i].Latitude;
        p.Longitude = geo[i].Longitude;
      });
    }
    return resp;
  }

  // ------------------------------------------------------------------
  // getPropertyById => returns ALL fields (no ?$select) + media
  // ------------------------------------------------------------------
  public async getPropertyById(
    propertyId: string,
    includeMedia = true
  ): Promise<ParagonPropertyWithMedia | null> {
    console.log(`[ParagonApiClient.getPropertyById] => propertyId=${propertyId}`);
    if (MOCK_DATA) {
      // If mocking
      const all = getMockProperties();
      let found = all.find((p) => p.ListingKey === propertyId);

      if (!found || (found.StandardStatus !== "Active" && found.StandardStatus !== "Pending")) {
        return null;
      }

      // geocode
      const geo = await geocodeProperties([found]);
      found.Latitude = geo[0].Latitude;
      found.Longitude = geo[0].Longitude;

      // If includeMedia => fetch images
      if (includeMedia) {
        const withMed = await this.populatePropertyMedia([found]);
        return withMed[0];
      }
      return found;
    }

    await this.forClientSecret();
    // Single property => must be Active or Pending
    const filter = `ListingKey eq '${encodeURIComponent(
      propertyId
    )}' and (StandardStatus eq 'Active' or StandardStatus eq 'Pending')`;

    // No ?$select => all fields
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, 1);

    if (!resp.value.length) {
      return null;
    }

    let item = resp.value[0];

    if (!(item.StandardStatus === "Active" || item.StandardStatus === "Pending")) {
      return null;
    }

    // If includeMedia => fetch all photos
    if (includeMedia) {
      const withMed = await this.populatePropertyMedia([item]);
      item = withMed[0];
    }

    // Geocode
    const geo = await geocodeProperties([item]);
    item.Latitude = geo[0].Latitude;
    item.Longitude = geo[0].Longitude;

    return item;
  }

  // ------------------------------------------------------------------
  // NEW METHOD => search by list agent name
  // ------------------------------------------------------------------
  public async searchByListAgentName(
    agentName: string,
    userFilters?: IUserFilters,
    includeMedia = false
  ): Promise<ParagonPropertyWithMedia[]> {
    console.log("[searchByListAgentName] => agentName=", agentName);

    if (MOCK_DATA) {
      // If mocking => just filter local data
      const all = getMockProperties();
      let filtered = all.filter(
        (p) =>
          (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
          p.ListAgentFullName?.toLowerCase().includes(agentName.toLowerCase())
      );
      // If userFilters present, you can apply them in memory if you like
      return filtered;
    }

    await this.forClientSecret();

    // (StandardStatus eq 'Active' or StandardStatus eq 'Pending')
    // AND contains(ListAgentFullName,'Tim Flores')
    let filter = `(StandardStatus eq 'Active' or StandardStatus eq 'Pending') and contains(ListAgentFullName, '${encodeURIComponent(
      agentName
    )}')`;

    // Optionally append userFilters
    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }

    const baseUrl = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    console.log("[searchByListAgentName] => final url =>", baseUrl);

    // Use getWithOffset
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(
      baseUrl,
      this.__offsetFetchLimit
    );

    let final = resp.value;
    if (includeMedia && final.length) {
      final = await this.populatePropertyMedia(final);
      // Also geocode
      const geo = await geocodeProperties(final);
      final.forEach((p, i) => {
        p.Latitude = geo[i].Latitude;
        p.Longitude = geo[i].Longitude;
      });
    }

    console.log(
      `[searchByListAgentName] => found => ${final.length} listings for agent=${agentName}`
    );
    return final;
  }

  // ------------------------------------------------------------------
  // BRAND NEW METHOD: getAllActivePendingWithCap500
  // ------------------------------------------------------------------
  /**
   * Fetches *only* Active or Pending properties, up to *500* total.
   * Optionally loads all Media and geocodes them.
   */
  public async getAllActivePendingWithCap500(includeMedia = true): Promise<IParagonProperty[]> {
    console.log("[getAllActivePendingWithCap500] => fetching up to 500 Active/Pending");

    // If mocking
    if (MOCK_DATA) {
      let all = getMockProperties();
      // Only keep Active or Pending
      all = all.filter((p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending");
      // Then cap at 500
      if (all.length > 500) all = all.slice(0, 500);

      if (!includeMedia) return all;

      // Geocode + Media
      const geo = await geocodeProperties(all);
      return this.populatePropertyMedia(geo);
    }

    // Real fetch
    await this.forClientSecret();
    const filter = `(StandardStatus eq 'Active' or StandardStatus eq 'Pending')`;
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;

    // We'll fetch up to 500 via getWithOffset
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, 500);
    console.log(`[getAllActivePendingWithCap500] => got => ${resp.value.length} items`);

    if (!includeMedia || !resp.value.length) {
      return resp.value;
    }

    // Populate media + geocode
    const [withMed, withGeo] = await Promise.all([
      this.populatePropertyMedia(resp.value),
      geocodeProperties(resp.value),
    ]);

    const final = withMed.map((p, i) => {
      p.Latitude = withGeo[i].Latitude;
      p.Longitude = withGeo[i].Longitude;
      return p;
    });

    console.log(`[getAllActivePendingWithCap500] => returning => ${final.length} items`);
    return final;
  }

  // ------------------------------------------------------------------
  // NEW METHOD => search by address and find properties
  // ------------------------------------------------------------------
  // This is the key method that needs to be updated in ParagonApiClient.ts
// Make sure this replaces the existing searchByAddress method
public async searchByAddress(
  address: string,
  radiusMiles: number = 0, // Default to 0 for exact address search
  userFilters?: IUserFilters,
  includeMedia = true
): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
  console.log("[searchByAddress] => address:", address, "radius:", radiusMiles);

  if (MOCK_DATA) {
    // For mock data, just return properties with similar addresses
    const all = getMockProperties();
    const addressLower = address.toLowerCase();
    const filtered = all.filter(
      (p) =>
        (p.StandardStatus === "Active" || p.StandardStatus === "Pending") &&
        (
          (p.StreetName && p.StreetName.toLowerCase().includes(addressLower)) ||
          (p.StreetNumber && p.StreetNumber.toLowerCase().includes(addressLower)) ||
          (p.City && p.City.toLowerCase().includes(addressLower))
        )
    );
    const geo = await geocodeProperties(filtered);
    if (includeMedia) {
      const withMed = await this.populatePropertyMedia(geo);
      return { "@odata.context": "mockAddress", value: withMed };
    }
    return { "@odata.context": "mockAddress", value: geo };
  }

  // Function to manually parse address components when geocoding fails
  const manuallyParseAddress = (addressStr: string) => {
    console.log("[searchByAddress] => Manually parsing address:", addressStr);
    
    // Remove any country suffix and trim
    let cleanAddress = addressStr.replace(/,\s*USA$/i, "").trim();
    
    // Extract components - this is a simple implementation
    const parts = cleanAddress.split(',').map(p => p.trim());
    
    // Assuming format like: "330 S Brooks St, Madison, WI 53715"
    const streetPart = parts[0] || '';
    const cityPart = parts.length > 1 ? parts[1] : '';
    
    // Extract street number and name from street part
    const streetMatch = streetPart.match(/^(\d+)\s+(.+)$/);
    const streetNumber = streetMatch ? streetMatch[1] : null;
    const streetName = streetMatch ? streetMatch[2] : null;
    
    // Extract city
    const cityMatch = cityPart.match(/^([^,]+)/);
    const city = cityMatch ? cityMatch[1].trim() : null;
    
    console.log("[searchByAddress] => Manually extracted:", {
      streetNumber,
      streetName,
      city
    });
    
    return {
      streetNumber,
      streetName,
      city
    };
  };

  try {
    let streetNumber = null;
    let streetName = null;
    let city = null;
    
    // First try geocoding with Google API
    try {
      console.log("[searchByAddress] => Trying geocoding with Google API:", address);
      
      // Use our own API endpoint to avoid exposing the key directly
      const geocodeResponse = await fetch(
        `/api/v1/geocode?address=${encodeURIComponent(address)}`,
        { headers: { 'Cache-Control': 'no-cache' } }
      );
      
      if (!geocodeResponse.ok) {
        throw new Error(`Geocoding API returned ${geocodeResponse.status}`);
      }
      
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData.status === "OK" && geocodeData.results && geocodeData.results.length > 0) {
        console.log("[searchByAddress] => Geocoding successful");
        
        // Extract address components from geocode result
        const addressComponents = geocodeData.results[0].address_components || [];
        console.log("[searchByAddress] => Address components:", JSON.stringify(addressComponents));
        
        // Extract street number
        streetNumber = addressComponents.find((c: { types: string[], long_name: string }) => 
          c.types.includes("street_number")
        )?.long_name;
        
        // Extract street name
        streetName = addressComponents.find((c: { types: string[], long_name: string }) => 
          c.types.includes("route")
        )?.long_name;
        
        // Extract city
        city = addressComponents.find((c: { types: string[], long_name: string }) => 
          c.types.includes("locality") || c.types.includes("sublocality")
        )?.long_name;
        
        console.log("[searchByAddress] => Extracted components:", {
          streetNumber,
          streetName,
          city
        });
      } else {
        throw new Error(`Geocoding failed: ${geocodeData.status}`);
      }
    } catch (geocodeError) {
      console.error("[searchByAddress] => Geocoding failed:", geocodeError);
      console.log("[searchByAddress] => Falling back to manual address parsing");
      
      // Fall back to manual parsing
      const manualComponents = manuallyParseAddress(address);
      streetNumber = manualComponents.streetNumber;
      streetName = manualComponents.streetName;
      city = manualComponents.city;
    }
    
    // If we still don't have components, try manual parsing
    if (!streetNumber || !streetName) {
      console.log("[searchByAddress] => Missing street components, trying manual parsing");
      const manualComponents = manuallyParseAddress(address);
      streetNumber = streetNumber || manualComponents.streetNumber;
      streetName = streetName || manualComponents.streetName;
      city = city || manualComponents.city;
    }
    
    // Validate that we have the minimum required components
    if (!streetNumber) {
      console.log("[searchByAddress] => Could not extract street number");
      return { "@odata.context": "streetNumberMissing", value: [] };
    }
    
    if (!streetName) {
      console.log("[searchByAddress] => Could not extract street name");
      return { "@odata.context": "streetNameMissing", value: [] };
    }
    
    await this.forClientSecret();
    const filterPortion = "(StandardStatus eq 'Active' or StandardStatus eq 'Pending')";
    
    // Create street name alternatives for common prefix/suffix variations
    const streetNameAlternatives: string[] = [];
    
    // Original street name
    streetNameAlternatives.push(streetName);
    
    // Normalize street name for better matching
    // Remove common prefixes like "North", "South", "East", "West" and their abbreviations
    const normalizedStreetName = streetName
      .replace(/^(north|south|east|west|n\.?|s\.?|e\.?|w\.?)\s+/i, '')
      .trim();
    
    if (normalizedStreetName !== streetName) {
      streetNameAlternatives.push(normalizedStreetName);
      console.log("[searchByAddress] => Added normalized street name:", normalizedStreetName);
    }
    
    // Handle case where "Old" might be omitted in database
    const words = streetName.split(' ');
    if (words.length > 1 && words[0].toLowerCase() === 'old') {
      // Add a version without the "Old" prefix
      const withoutOld = words.slice(1).join(' ');
      streetNameAlternatives.push(withoutOld);
      console.log("[searchByAddress] => Added version without 'Old' prefix:", withoutOld);
    }
    
    // Sometimes street names may have abbreviations
    // Convert common street suffixes to their alternatives
    const streetSuffixMap: Record<string, string[]> = {
      'street': ['st', 'str'],
      'st': ['street', 'str'],
      'avenue': ['ave', 'av'],
      'ave': ['avenue', 'av'],
      'boulevard': ['blvd', 'boul'],
      'blvd': ['boulevard', 'boul'],
      'drive': ['dr'],
      'dr': ['drive'],
      'road': ['rd'],
      'rd': ['road'],
      'place': ['pl'],
      'pl': ['place'],
      'lane': ['ln'],
      'ln': ['lane'],
      'court': ['ct'],
      'ct': ['court'],
      'circle': ['cir'],
      'cir': ['circle'],
      'trail': ['tr', 'trl'],
      'tr': ['trail', 'trl'],
      'trl': ['trail', 'tr'],
      'way': [],
      'parkway': ['pkwy'],
      'pkwy': ['parkway']
    };
    
    // Check if the last word is a known street suffix
    const lastWord = words[words.length - 1].toLowerCase();
    if (streetSuffixMap[lastWord]) {
      // For each alternative suffix, create a new street name variation
      for (const altSuffix of streetSuffixMap[lastWord]) {
        const newStreetName = [...words.slice(0, -1), altSuffix].join(' ');
        streetNameAlternatives.push(newStreetName);
        console.log("[searchByAddress] => Added suffix alternative:", newStreetName);
      }
    }
    
    console.log("[searchByAddress] => Street name alternatives:", streetNameAlternatives);
    
    // Helper function to safely encode values for OData
    const safeEncode = (value: string): string => {
      // Replace apostrophes with double apostrophes for OData
      return value.replace(/'/g, "''");
    };
    
    // Build search filters - focus on street number + street name + city
    let possibleFilters: string[] = [];
    
    // Start with the most specific filter: street number + street name + city (if available)
    if (streetNumber && streetName && city) {
      for (const streetNameAlt of streetNameAlternatives) {
        possibleFilters.push(
          `(StreetNumberNumeric eq ${streetNumber} and contains(StreetName, '${safeEncode(streetNameAlt)}') and contains(City, '${safeEncode(city)}')`
        );
        
        // Also try with StreetNumber field (string version)
        possibleFilters.push(
          `(StreetNumber eq '${safeEncode(streetNumber)}' and contains(StreetName, '${safeEncode(streetNameAlt)}') and contains(City, '${safeEncode(city)}')`
        );
      }
    }
    
    // Next, try street number + street name without city
    if (streetNumber && streetName) {
      for (const streetNameAlt of streetNameAlternatives) {
        possibleFilters.push(
          `(StreetNumberNumeric eq ${streetNumber} and contains(StreetName, '${safeEncode(streetNameAlt)}')`
        );
        
        // Also try with StreetNumber field (string version)
        possibleFilters.push(
          `(StreetNumber eq '${safeEncode(streetNumber)}' and contains(StreetName, '${safeEncode(streetNameAlt)}')`
        );
      }
    }
    
    // Try just the street number as a last resort
    possibleFilters.push(`(StreetNumberNumeric eq ${streetNumber})`);
    possibleFilters.push(`(StreetNumber eq '${safeEncode(streetNumber)}')`);
    
    // Add closing parentheses to all filters
    possibleFilters = possibleFilters.map(f => f.endsWith(')') ? f : f + ')');
    
    // If we still have no filters, return empty result
    if (possibleFilters.length === 0) {
      console.log("[searchByAddress] => No valid filters could be created");
      return { "@odata.context": "addressNoFilters", value: [] };
    }
    
    // Combine all possible filters with OR
    const addressFilter = possibleFilters.join(' or ');
    let filter = `${filterPortion} and (${addressFilter})`;
    
    // Log the final filter for debugging
    console.log("[searchByAddress] => Final filter:", filter);
    
    // Append user filters
    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }
    
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    
    try {
      console.log("[searchByAddress] => Executing query");
      const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);
      console.log(`[searchByAddress] => Found ${resp.value.length} properties`);
      
      if (resp.value.length > 0) {
        if (includeMedia) {
          resp.value = await this.populatePropertyMedia(resp.value);
          
          // Also geocode
          const geo = await geocodeProperties(resp.value);
          resp.value.forEach((p, i) => {
            p.Latitude = geo[i].Latitude;
            p.Longitude = geo[i].Longitude;
          });
        }
        
        return resp;
      }
      
      // If no properties found with combined query, try simpler approaches one by one
      console.log("[searchByAddress] => No properties found with combined query, trying one-by-one approach");
      
      // Try each filter individually
      for (const singleFilter of possibleFilters) {
        const simplifiedFilter = `${filterPortion} and ${singleFilter}`;
        const simplifiedBase = `${this.__baseUrl}/Property?$count=true&$filter=${simplifiedFilter}`;
        
        console.log("[searchByAddress] => Trying individual filter:", simplifiedFilter);
        const simplifiedResp = await this.getWithOffset<ParagonPropertyWithMedia>(simplifiedBase, this.__offsetFetchLimit);
        
        if (simplifiedResp.value.length > 0) {
          console.log(`[searchByAddress] => Found ${simplifiedResp.value.length} properties with filter: ${singleFilter}`);
          
          if (includeMedia) {
            simplifiedResp.value = await this.populatePropertyMedia(simplifiedResp.value);
            
            // Also geocode
            const geo = await geocodeProperties(simplifiedResp.value);
            simplifiedResp.value.forEach((p, i) => {
              p.Latitude = geo[i].Latitude;
              p.Longitude = geo[i].Longitude;
            });
          }
          
          return simplifiedResp;
        }
      }
      
      console.log("[searchByAddress] => No properties found with any filters");
      return { "@odata.context": "noPropertiesFound", value: [] };
      
    } catch (fetchError) {
      console.error("[searchByAddress] => Error fetching properties:", fetchError);
      
      // If there's an error, try with just the street number
      console.log("[searchByAddress] => Error with filter, trying with just street number");
      
      // Just use street number as a simpler filter
      const simplifiedFilter = `${filterPortion} and (StreetNumberNumeric eq ${streetNumber})`;
      const simplifiedBase = `${this.__baseUrl}/Property?$count=true&$filter=${simplifiedFilter}`;
      
      try {
        console.log("[searchByAddress] => Executing simplified query:", simplifiedFilter);
        const simplifiedResp = await this.getWithOffset<ParagonPropertyWithMedia>(simplifiedBase, this.__offsetFetchLimit);
        console.log(`[searchByAddress] => Found ${simplifiedResp.value.length} properties with simplified filter`);
        
        if (includeMedia && simplifiedResp.value.length) {
          simplifiedResp.value = await this.populatePropertyMedia(simplifiedResp.value);
          
          // Also geocode
          const geo = await geocodeProperties(simplifiedResp.value);
          simplifiedResp.value.forEach((p, i) => {
            p.Latitude = geo[i].Latitude;
            p.Longitude = geo[i].Longitude;
          });
        }
        
        return simplifiedResp;
      } catch (innerError) {
        console.error("[searchByAddress] => Error with simplified query:", innerError);
        return { "@odata.context": "errorWithSimplifiedQuery", value: [] };
      }
    }
  } catch (error) {
    console.error("[searchByAddress] => Error:", error);
    return { "@odata.context": "addressSearchError", value: [] };
  }
}



}

// Env config
const RESO_BASE_URL = process.env.RESO_BASE_URL ?? "";
const RESO_TOKEN_URL = process.env.RESO_TOKEN_URL ?? "";
const RESO_CLIENT_ID = process.env.RESO_CLIENT_ID ?? "";
const RESO_CLIENT_SECRET = process.env.RESO_CLIENT_SECRET ?? "";

const paragonApiClient = new ParagonApiClient(
  RESO_BASE_URL,
  RESO_TOKEN_URL,
  RESO_CLIENT_ID,
  RESO_CLIENT_SECRET,
  false
);

export default paragonApiClient;