import IParagonMedia, { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import IParagonProperty from "@/types/IParagonProperty";
import md5 from "crypto-js/md5";
import { existsSync } from "fs";
import fs from "node:fs/promises";
import path from "path";
import * as url from "url";

interface ITokenResponse {
  token_type: "Bearer";
  access_token: string;
  expires_in: number;
}

interface ILocalToken {
  token: string;
  tokenExpiration: Date;
}

interface IOdataResponse<T> {
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

  constructor(
    baseUrl: string,
    tokenUrl: string,
    clientId: string,
    clientSecret: string
  ) {
    this.__baseUrl = baseUrl;
    this.__tokenUrl = tokenUrl;
    this.__clientId = clientId;
    this.__clientSecret = clientSecret;

    // Storing token locally for now...
    this.initializeToken().then();
  }

  // Get the token and expiration date from a local file...
  private async initializeToken(): Promise<void> {
    const filepath = path.join(
      process.cwd(),
      `tokens/.token${md5(this.__clientId)}`
    );

    if (existsSync(filepath)) {
      console.log("Token file found!");

      fs.readFile(filepath).then((data) => {
        const token = JSON.parse(data.toString()) as ILocalToken;
        this.__accessToken = token.token;
        this.__tokenExpiration = new Date(token.tokenExpiration);
      });
    }
  }

  // Store token locally
  private async saveToken(token: string, expiration: Date): Promise<void> {
    const dirpath = path.join(process.cwd(), `tokens`);
    const filepath = path.join(dirpath, `/.token${md5(this.__clientId)}`);

    if (!existsSync(dirpath)) {
      await fs.mkdir(dirpath);
    }

    await fs.writeFile(
      filepath,
      JSON.stringify({ token: token, tokenExpiration: expiration })
    );
  }

  // Initialize with a client secret. Will get an access token from the token server...
  private async forClientSecret(): Promise<ParagonApiClient> {
    // Early return if we already have a valid token...
    if (
      this.__accessToken &&
      this.__tokenExpiration &&
      new Date() < this.__tokenExpiration
    ) {
      return this;
    }

    // Body...
    const body = new url.URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("scope", "OData");

    // Headers...
    const token = Buffer.from(
      `${this.__clientId}:${this.__clientSecret}`
    ).toString("base64");
    const headers: HeadersInit = {};
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["Accept"] = "application/json";
    headers["Authorization"] = `Basic ${token}`;

    // Make the request and return the JSON...
    const options: RequestInit = {
      method: "POST",
      headers: headers,
      body: body,
      cache: "no-store",
    };
    const response = await fetch(this.__tokenUrl, options);
    const tokenResponse = (await response.json()) as ITokenResponse;

    // Save the token and expiration date...
    this.__accessToken = tokenResponse.access_token;
    this.__tokenExpiration = new Date(
      new Date().getTime() + tokenResponse.expires_in * 1000
    );
    await this.saveToken(this.__accessToken, this.__tokenExpiration);

    return this;
  }

  // Get the value to be used as the "Authorization" header...
  private async __getAuthHeaderValue(): Promise<string> {
    await this.forClientSecret();

    return `Bearer ${this.__accessToken}`;
  }

  private async get<T>(url: string): Promise<IOdataResponse<T>> {
    const headers: HeadersInit = {};
    headers["Authorization"] = await this.__getAuthHeaderValue();

    const options: RequestInit = { method: "GET", headers: headers };
    const response = await fetch(url, options);

    return (await response.json()) as IOdataResponse<T>;
  }

  private async getFollowNext<T>(url: string): Promise<IOdataResponse<T>> {
    const response = await this.get<T>(url);

    if (response["@odata.nextLink"]) {
      response.value = response.value.concat(
        (await this.getFollowNext<T>(response["@odata.nextLink"])).value
      );
      delete response["@odata.nextLink"];
    }

    return response;
  }

  private getPropertyUrl(top: number, skip?: number): string {
    const filterStr = `&$filter=StandardStatus eq 'Active'`;
    const topStr = top ? `&$top=${top}` : "";
    const skipStr = skip ? `&$skip=${skip}` : "";

    // This help testing the media endpoint with fewer data
    //return `${this.__baseUrl}/Property?$select=ListingKey&$count=true${filterStr}${topStr}${skipStr}`;
    return `${this.__baseUrl}/Property?$count=true${filterStr}${topStr}${skipStr}`;
  }

  // Just used for testing...
  public async getAllProperty(top?: number): Promise<IParagonProperty[]> {
    const url = this.getPropertyUrl(top ? top : this.__maxPageSize);
    const response = await this.get<IParagonProperty>(url);

    if (!top) {
      const count = response["@odata.count"];

      if (count && count > this.__maxPageSize) {
        return response.value.concat(
          (
            await this.getFollowNext<IParagonProperty>(
              this.getPropertyUrl(count, this.__maxPageSize)
            )
          ).value
        );
      }
    }

    return response.value;
  }

  private getMediaUrl(top: number, skip?: number, filter?: string): string {
    const topStr = top ? `&$top=${top}` : "";
    const skipStr = skip ? `&$skip=${skip}` : "";
    const filterStr = filter ? `&$filter=${filter}` : "";

    // This help testing the media endpoint with fewer data
    //return `${this.__baseUrl}/Media?$select=ResourceRecordKey,MediaURL&$count=true${topStr}${skipStr}${filterStr}`;
    return `${this.__baseUrl}/Media?$count=true${topStr}${skipStr}${filterStr}`;
  }

  private generateMediaFilters(listingKeys: string[]): string[] {
    const baseURL = this.getMediaUrl(9999999, 9999999, "1");
    const maxURLLength = 2048;

    let mediaFilters = [];
    let filter = "";

    const generateFilter = (id: string, reset: boolean = false) =>
      `${filter === "" || reset ? "" : " or "}ResourceRecordKey eq '${id}'`;
    const getEncodedLength = (str: string) =>
      url.format(url.parse(str, true)).length;

    for (const id of listingKeys) {
      const currentFilter = generateFilter(id);

      if (
        getEncodedLength(`${baseURL}${filter}${currentFilter}`) <= maxURLLength
      ) {
        filter += currentFilter;
      } else {
        if (filter !== "" || id === listingKeys[listingKeys.length - 1]) {
          mediaFilters.push(filter);
        }
        filter = generateFilter(id, true);
      }
    }

    return mediaFilters;
  }
  public async searchByStreetName(): Promise<{
    "@odata.context": string;
    "@odata.nextLink": string;
    value: IParagonProperty[];
  }> {
    const url = `${this.__baseUrl}/Property?$filter=contains(StreetName, 'Kenosha')`;

    const headers: HeadersInit = {};
    headers["Accept"] = "application/json";
    headers["Authorization"] = await this.__getAuthHeaderValue();

    const options: RequestInit = { method: "GET", headers: headers };
    const response = await fetch(url, options);
    return await response.json();
  }

  public async searchByZipCode(zipCode: string): Promise<{
    "@odata.context": string;
    "@odata.nextLink": string;
    value: IParagonProperty[];
  }> {
    const url = `${this.__baseUrl}/Property?$filter=contains(PostalCode, '${zipCode}')`;

    const headers: HeadersInit = {};
    headers["Accept"] = "application/json";
    headers["Authorization"] = await this.__getAuthHeaderValue();

    const options: RequestInit = { method: "GET", headers: headers };
    const response = await fetch(url, options);
    return await response.json();
  }

  public async getAllPropertyWithMedia(top?: number): Promise<any> {
    const properties: ParagonPropertyWithMedia[] = await this.getAllProperty(
      top
    );

    let queries = this.generateMediaFilters(
      properties.map((p) => p.ListingKey)
    );

    while (queries.length > 0) {
      // Get the next set of URLs
      const currentQueries = queries.slice(0, this.__maxConcurrentQueries);

      // Send requests to all URLs in the current set
      await Promise.all(
        currentQueries.map(async (filter) => {
          const url = this.getMediaUrl(this.__maxPageSize, undefined, filter);
          const response = await this.get<IParagonMedia>(url);
          const count = response["@odata.count"];

          if (count && count > this.__maxPageSize) {
            response.value = response.value.concat(
              (
                await this.getFollowNext<IParagonMedia>(
                  this.getMediaUrl(count, this.__maxPageSize, filter)
                )
              ).value
            );
          }

          response.value.map((media) => {
            const property = properties.find(
              (p) => p.ListingKey === media.ResourceRecordKey
            );
            if (property) {
              if (!property.Media) {
                property.Media = [];
              }
              property.Media.push(media);
            }
          });
        })
      );

      // Remove the URLs that have been processed
      queries = queries.slice(this.__maxConcurrentQueries);
    }

    return properties;
  }
}

const RESO_BASE_URL = process.env.RESO_BASE_URL ?? "";
const RESO_TOKEN_URL = process.env.RESO_TOKEN_URL ?? "";
const RESO_CLIENT_ID = process.env.RESO_CLIENT_ID ?? "";
const RESO_CLIENT_SECRET = process.env.RESO_CLIENT_SECRET ?? "";

const paragonApiClient = new ParagonApiClient(
  RESO_BASE_URL,
  RESO_TOKEN_URL,
  RESO_CLIENT_ID,
  RESO_CLIENT_SECRET
);

export default paragonApiClient;
