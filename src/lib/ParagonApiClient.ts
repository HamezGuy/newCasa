import IParagonMedia, { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import IParagonProperty from "@/types/IParagonProperty";
import md5 from "crypto-js/md5";
import getConfig from "next/config";
import pMap from "p-map";
// (CHANGED) We no longer import fs/promises or path at the top. We will load them dynamically.
import * as url from "url";
import { geocodeProperties } from "./GoogleMaps";

const { serverRuntimeConfig = {} } = getConfig() || {};
const zipCodes = serverRuntimeConfig.zipCodes || [];

// Switch to mock data by setting process.env.MOCK_DATA = "true"
const MOCK_DATA = process.env.MOCK_DATA === "true";

// Lazy-load local JSON once for mock
let mockDataCache: IParagonProperty[] = [];
function getMockProperties(): IParagonProperty[] {
  if (mockDataCache.length === 0) {
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
 * NEW: Interface for user filters => Ties each user selection
 * to the correct IParagonProperty field (ListPrice, PropertyType, BedroomsTotal).
 */
// CHANGED: propertyTypes => { value: string }[]
export interface IUserFilters {
  minPrice?: number;         // => ListPrice ge X
  maxPrice?: number;         // => ListPrice le X
  propertyTypes?: { value: string }[];  // CHANGED
  minRooms?: number;         // => BedroomsTotal ge X
  maxRooms?: number;         // => BedroomsTotal le X
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

  // Concurrency for Media
  private __maxPageSize = 2500;
  private __maxConcurrentQueries = 120;

  private __zipCodes: string[];
  private __limitToTwenty: boolean;

  /**
   * Controls how many total items we gather via getWithOffset()
   * before stopping. Adjust if needed.
   */
  private __offsetFetchLimit = 200; // default: 200

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

    // (CHANGED) Skip reading the token file if on Vercel or in browser
    if (typeof window !== "undefined" || process.env.VERCEL) {
      console.log("[initializeToken] => In browser or on Vercel => skipping file read");
      return;
    }

    // (CHANGED) Dynamically import fs/promises and path only on the server
    const fs = await import("fs/promises");
    const path = await import("path");
    const filepath = path.join(process.cwd(), `tokens/.token${md5(this.__clientId)}`);
    console.log("[initializeToken] => token path:", filepath);

    try {
      const data = await fs.readFile(filepath);
      const token = JSON.parse(data.toString()) as ILocalToken;
      this.__accessToken = token.token;
      this.__tokenExpiration = new Date(token.tokenExpiration);
      console.log("[initializeToken] => loaded => expires:", this.__tokenExpiration);
    } catch (err) {
      console.log("[initializeToken] => token file missing:", err);
    }
  }

  // REMOVED ENTIRE saveToken() METHOD
  // public async saveToken(token: string, expiration: Date): Promise<void> {
  //   ...
  // }

  public async forClientSecret(): Promise<ParagonApiClient> {
    if (MOCK_DATA) return this;

    console.log("[forClientSecret] => Checking token...");
    if (this.__accessToken && this.__tokenExpiration && new Date() < this.__tokenExpiration) {
      console.log("[forClientSecret] => token still valid");
      return this;
    }

    console.log("[forClientSecret] => need new token => requesting...");
    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("scope", "OData");

    const token = Buffer.from(`${this.__clientId}:${this.__clientSecret}`).toString("base64");
    const headers: HeadersInit = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${token}`,
    };

    const resp = await fetch(this.__tokenUrl, {
      method: "POST",
      headers,
      body: body.toString(),
      cache: "no-store",
    });
    const tokenResp = (await resp.json()) as ITokenResponse;
    console.log("[forClientSecret] => tokenResp =>", tokenResp);

    this.__accessToken = tokenResp.access_token;
    this.__tokenExpiration = new Date(Date.now() + tokenResp.expires_in * 1000);

    // REMOVED THE LINE BELOW THAT CALLED saveToken()
    // await this.saveToken(this.__accessToken, this.__tokenExpiration);

    console.log("[forClientSecret] => new token => expires:", this.__tokenExpiration);
    return this;
  }

  private async __getAuthHeader(): Promise<string> {
    await this.forClientSecret();
    return `Bearer ${this.__accessToken}`;
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

      // Record context from first chunk
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

  // Actually fetch OData
  private async __fetchOdata<T>(url: string): Promise<IOdataResponse<T>> {
    if (MOCK_DATA) {
      return { "@odata.context": "mockData", value: [] as T[] };
    }

    console.log("[__fetchOdata] => fetch =>", url);
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
      console.error("[__fetchOdata] => Non-OK =>", resp.status, body);
      throw new Error(`HTTP error => ${resp.status} => ${url}`);
    }

    try {
      const json = await resp.json();
      return json as IOdataResponse<T>;
    } catch (parseErr) {
      console.error("[__fetchOdata] => parse error =>", parseErr);
      throw new Error("Invalid JSON => " + url);
    }
  }

  // ------------------------------------------------------------------
  // Media logic => offset approach if multiple pages
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
    const base = this.getMediaUrl(9999999, 9999999, "1");
    const maxLen = 2048;
    const out: string[] = [];
    let acc = "";

    const getLen = (str: string) => url.format(url.parse(str, true)).length;

    const piece = (id: string, first: boolean) =>
      (first ? "" : " or ") + `ResourceRecordKey eq '${id}'`;

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

    const listingKeys = properties.map((p) => p.ListingKey!);
    const filterChunks = this.generateMediaFilters(listingKeys);

    const mediaByProp: Record<string, IParagonMedia[]> = {};

    // For each chunk of listing keys, fetch all media results
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

          if (resp.value.length < pageSize) break;
          skip += resp.value.length;
        }
      },
      { concurrency: this.__maxConcurrentQueries }
    );

    const finalList = this.__limitToTwenty ? properties.slice(0, limit || 3) : properties;

    // Attach media to each property
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
  // NEW: buildUserFilter => convert user filter object to OData string
  // e.g. "ListPrice ge 200000 and (PropertyType eq 'house' or PropertyType eq 'condo')"
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
  // ------------------------------------------------------------------
  public async searchByZipCodeFilterAfter(
    zip: string,
    includeMedia = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    console.log("[searchByZipCodeFilterAfter => originally filter AFTER] => zip=", zip);

    if (MOCK_DATA) {
      // 1) All matching the zip in mock
      const all = getMockProperties();
      const raw = all.filter((p) => p.PostalCode?.includes(zip));

      // 2) Filter in memory for standard status
      const filtered = raw.filter(
        (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
      );

      // 3) (optional) geocode & media
      const geo = await geocodeProperties(filtered);
      if (!includeMedia) {
        return { "@odata.context": "mockZip", value: geo };
      }
      const withMed = await this.populatePropertyMedia(geo);
      return { "@odata.context": "mockZip", value: withMed };
    }

    // Real fetch
    await this.forClientSecret();
    // No status filter at the OData level => we only filter by zip
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(PostalCode, '${encodeURIComponent(
      zip
    )}')`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    // Filter in memory => StandardStatus = Active or Pending
    let final = resp.value.filter(
      (p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending"
    );

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

    await this.forClientSecret();
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(City, '${encodeURIComponent(
      city
    )}')`;
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
      const raw = all.filter((p) =>
        p.StreetName?.toLowerCase().includes(street.toLowerCase())
      );
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
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(StreetName, '${encodeURIComponent(
      street
    )}')`;
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
    const base = `${this.__baseUrl}/Property?$count=true&$filter=contains(CountyOrParish, '${encodeURIComponent(
      county
    )}')`;
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
  // getAllPropertyWithMedia => (Now filter Active/Pending at OData)
  // ------------------------------------------------------------------
  public async getAllPropertyWithMedia(top?: number): Promise<IParagonProperty[]> {
    console.log("[getAllPropertyWithMedia] => offset => top=", top);

    if (MOCK_DATA) {
      let all = getMockProperties();
      // Only keep Active or Pending
      all = all.filter((p) => p.StandardStatus === "Active" || p.StandardStatus === "Pending");
      if (top && top < all.length) all = all.slice(0, top);
      const geo = await geocodeProperties(all);
      return this.populatePropertyMedia(geo);
    }

    await this.forClientSecret();

    const desired = top || this.__offsetFetchLimit;
    const filter = `(StandardStatus eq 'Active' or StandardStatus eq 'Pending')`;
    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;

    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, desired);
    console.log("[getAllPropertyWithMedia] => got =>", resp.value.length);

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
      // FIX: Use `geo` instead of `resp.value` to avoid scoping error:
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
  // Normal "search" methods => Filter-Before by default
  // ------------------------------------------------------------------
  public async searchByZipCode(
    zip: string,
    userFilters?: IUserFilters, // optional user filters
    includeMedia = true
  ) {
    console.log("[searchByZipCode => filter BEFORE at API by StandardStatus] => zip=", zip);

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
    let filter = `${filterPortion} and contains(PostalCode, '${encodeURIComponent(zip)}')`;

    // If userFilters => build snippet, append
    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }

    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
    }
    return resp;
  }

  public async searchByCity(
    city: string,
    userFilters?: IUserFilters, // optional
    includeMedia = true
  ) {
    console.log("[searchByCity => filter BEFORE at API by StandardStatus] => city=", city);

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
    let filter = `${filterPortion} and contains(City, '${encodeURIComponent(city)}')`;

    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }

    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
    }
    return resp;
  }

  public async searchByStreetName(
    street: string,
    userFilters?: IUserFilters, // optional
    includeMedia = true
  ) {
    console.log("[searchByStreetName => filter BEFORE at API by StandardStatus] => street=", street);

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
    let filter = `${filterPortion} and contains(StreetName, '${encodeURIComponent(street)}')`;

    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }

    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
    }
    return resp;
  }

  public async searchByCounty(
    county: string,
    userFilters?: IUserFilters, // optional
    includeMedia = true
  ) {
    console.log("[searchByCounty => filter BEFORE at API by StandardStatus] => county=", county);

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
    let filter = `${filterPortion} and contains(CountyOrParish, '${encodeURIComponent(county)}')`;

    const userPart = this.buildUserFilter(userFilters);
    if (userPart) {
      filter += ` and ${userPart}`;
    }

    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, this.__offsetFetchLimit);

    if (includeMedia && resp.value.length) {
      resp.value = await this.populatePropertyMedia(resp.value);
    }
    return resp;
  }

  // ------------------------------------------------------------------
  // getPropertyById => now only returns it if it's Active or Pending
  // ------------------------------------------------------------------
  public async getPropertyById(
    propertyId: string,
    includeMedia = true
  ): Promise<ParagonPropertyWithMedia | null> {
    console.log(`[ParagonApiClient.getPropertyById] => propertyId=${propertyId}`);
    if (MOCK_DATA) {
      // Local find in mock
      const all = getMockProperties();
      let found = all.find((p) => p.ListingKey === propertyId);

      // Filter out if not Active/Pending
      if (!found || (found.StandardStatus !== "Active" && found.StandardStatus !== "Pending")) {
        return null;
      }

      // Geocode & optional media
      const geo = await geocodeProperties([found]);
      found.Latitude = geo[0].Latitude;
      found.Longitude = geo[0].Longitude;
      if (includeMedia) {
        const withMed = await this.populatePropertyMedia([found]);
        return withMed[0];
      }
      return found;
    }

    await this.forClientSecret();
    // Single property => must be Active or Pending
    // e.g.: ...$filter=ListingKey eq '12345' and (StandardStatus eq 'Active' or 'Pending')
    const filter = `ListingKey eq '${encodeURIComponent(
      propertyId
    )}' and (StandardStatus eq 'Active' or StandardStatus eq 'Pending')`;

    const base = `${this.__baseUrl}/Property?$count=true&$filter=${filter}`;
    const resp = await this.getWithOffset<ParagonPropertyWithMedia>(base, 1);

    if (!resp.value.length) {
      return null;
    }

    let item = resp.value[0];

    // If you want to do a final check (redundant if OData is correct):
    if (!(item.StandardStatus === "Active" || item.StandardStatus === "Pending")) {
      return null;
    }

    // Populate media if requested
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
