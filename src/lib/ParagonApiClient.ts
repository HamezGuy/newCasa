<<<<<<< HEAD
import IParagonMedia, { ParagonPropertyWithMedia } from '@/types/IParagonMedia';
import IParagonProperty from '@/types/IParagonProperty';
import md5 from 'crypto-js/md5';
import { existsSync } from 'fs';
import getConfig from 'next/config';
import fs from 'node:fs/promises';
import path from 'path';
import * as url from 'url';
import { geocodeProperties } from './GoogleMaps';
=======
import IParagonMedia, { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import IParagonProperty from "@/types/IParagonProperty";
import md5 from "crypto-js/md5";
import getConfig from "next/config";
import path from "path";
import * as url from "url";
>>>>>>> main

const { serverRuntimeConfig } = getConfig();

interface ITokenResponse {
  token_type: 'Bearer';
  access_token: string;
  expires_in: number;
}

interface ILocalToken {
  token: string;
  tokenExpiration: Date;
}

export interface IOdataResponse<T> {
  '@odata.context': string;
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
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
  private __zipCodes = [];

  constructor(baseUrl: string, tokenUrl: string, clientId: string, clientSecret: string) {
    this.__baseUrl = baseUrl;
    this.__tokenUrl = tokenUrl;
    this.__clientId = clientId;
    this.__clientSecret = clientSecret;
    this.__zipCodes = serverRuntimeConfig.zipCodes ?? [];
  }

  // Server-side only token initialization logic
  public async initializeToken(): Promise<void> {
    // In Next.js, fs operations need to be on the server side
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises'); // Dynamically import fs on the server-side
      const filepath = path.join(process.cwd(), `tokens/.token${md5(this.__clientId)}`);

      try {
        const data = await fs.readFile(filepath);
        const token = JSON.parse(data.toString()) as ILocalToken;
        this.__accessToken = token.token;
        this.__tokenExpiration = new Date(token.tokenExpiration);
      } catch (err) {
        console.log('Token file not found or could not be read');
      }
    }
  }

  public async saveToken(token: string, expiration: Date): Promise<void> {
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises'); // Dynamically import fs on the server-side
      const dirpath = path.join(process.cwd(), `tokens`);
      const filepath = path.join(dirpath, `/.token${md5(this.__clientId)}`);

      try {
        await fs.mkdir(dirpath, { recursive: true });
        await fs.writeFile(filepath, JSON.stringify({ token: token, tokenExpiration: expiration }));
      } catch (err) {
        console.error('Error saving token', err);
      }
    }
  }

  public async forClientSecret(): Promise<ParagonApiClient> {
    if (this.__accessToken && this.__tokenExpiration && new Date() < this.__tokenExpiration) {
      return this;
    }

    const body = new url.URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('scope', 'OData');

    const token = Buffer.from(`${this.__clientId}:${this.__clientSecret}`).toString("base64");
    const headers: HeadersInit = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "Authorization": `Basic ${token}`,
    };

    const options: RequestInit = {
      method: 'POST',
      headers: headers,
      body: body.toString(), 
      cache: "no-store",
    };
    const response = await fetch(this.__tokenUrl, options);
    const tokenResponse = (await response.json()) as ITokenResponse;

    this.__accessToken = tokenResponse.access_token;
    this.__tokenExpiration = new Date(new Date().getTime() + tokenResponse.expires_in * 1000);
    await this.saveToken(this.__accessToken, this.__tokenExpiration);

    return this;
  }

  private async __getAuthHeaderValue(): Promise<string> {
    await this.forClientSecret();
    return `Bearer ${this.__accessToken}`;
  }

  private async get<T>(url: string): Promise<IOdataResponse<T>> {
    const headers: HeadersInit = {
      Authorization: await this.__getAuthHeaderValue(),
    };
    const options: RequestInit = { method: "GET", headers: headers };
    const response = await fetch(url, options);
    return (await response.json()) as IOdataResponse<T>;
  }

  private async getFollowNext<T>(url: string): Promise<IOdataResponse<T>> {
    const response = await this.get<T>(url);

    if (response['@odata.nextLink']) {
      response.value = response.value.concat(
        (await this.getFollowNext<T>(response['@odata.nextLink'])).value
      );
      delete response['@odata.nextLink'];
    }

    return response;
  }

  private getRealtorFilters(): string {
    return this.__zipCodes.map((zipCode) => `PostalCode eq '${zipCode}'`).join(" or ");
  }

  private getPropertyUrl(top: number, skip?: number): string {
    const realtorFilters = this.getRealtorFilters();
    const filterStr = `$filter=StandardStatus eq 'Active' and (${realtorFilters})`;

    const topStr = top ? `&$top=${top}` : "";
    const skipStr = skip ? `&$skip=${skip}` : "";

    return `${this.__baseUrl}/Property?$count=true&${filterStr}${topStr}${skipStr}`;
  }

  private getMediaUrl(top: number, skip?: number, filter?: string): string {
    const topStr = top ? `&$top=${top}` : '';
    const skipStr = skip ? `&$skip=${skip}` : '';
    const filterStr = filter ? `&$filter=${filter}` : '';

    return `${this.__baseUrl}/Media?$select=ResourceRecordKey,MediaURL,Order&$count=true${topStr}${skipStr}${filterStr}`;
  }

  // Generate filter strings for media requests to avoid URL length issues
  private generateMediaFilters(listingKeys: string[]): string[] {
    const baseURL = this.getMediaUrl(9999999, 9999999, '1');
    const maxURLLength = 2048;

    let mediaFilters: string[] = [];
    let accFilter = '';

    const getEncodedLength = (str: string) => url.format(url.parse(str, true)).length;

    const generateFilter = (id: string, isFirst: boolean = false) => {
      const prefix = isFirst ? '' : ' or ';
      return `${prefix}ResourceRecordKey eq '${id}'`;
    };

    const pushNewFilter = (filter: string) => {
      if (filter !== '') {
        mediaFilters.push(filter);
      }
    };

    for (const id of listingKeys) {
      const currentFilter = generateFilter(id, accFilter === '');
      const currentURL = `${baseURL}${accFilter}${currentFilter}`;

      if (getEncodedLength(currentURL) <= maxURLLength) {
        accFilter += currentFilter;
      } else {
        pushNewFilter(accFilter);
        accFilter = generateFilter(id, true);
      }
    }

    pushNewFilter(accFilter);

    return mediaFilters;
  }

  public async populatePropertyMedia(
    properties: ParagonPropertyWithMedia[],
    limit: number = 0
  ): Promise<ParagonPropertyWithMedia[]> {
    if (!Array.isArray(properties) || properties.length === 0) {
      console.error("Invalid properties data:", properties);
      return [];
    }

    let queries = this.generateMediaFilters(
      properties.map((p) => {
        if (!p.ListingKey) {
          console.error("Property is missing ListingKey:", p);
        }
        return p.ListingKey;
      })
    );

    while (queries.length > 0) {
      const currentQueries = queries.slice(0, this.__maxConcurrentQueries);

      await Promise.all(
        currentQueries.map(async (filter) => {
          const url = this.getMediaUrl(this.__maxPageSize, undefined, filter);
          const response = await this.get<IParagonMedia>(url);
          const count = response['@odata.count'];

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
            const property = properties.find((p) => p.ListingKey === media.ResourceRecordKey);
            if (property) {
              if (!property.Media) {
                property.Media = [];
              }

              if (limit === 0 || property.Media.length < limit) {
                property.Media.push(media);
              }
            }
          });
        })
      );

      queries = queries.slice(this.__maxConcurrentQueries);
    }

    return properties;
  }

  public async getPropertyById(id: string, includeMedia: boolean = true): Promise<IParagonProperty> {
    const url = `${this.__baseUrl}/Property?$filter=ListingId eq '${id}'`;
    const response = await this.get<ParagonPropertyWithMedia>(url);

    if (response.value && includeMedia) {
      response.value = await this.populatePropertyMedia(response.value);
    }

    return response.value[0];
  }

  public async searchByZipCode(
    zipCode: string,
    includeMedia: boolean = true
  ): Promise<IOdataResponse<ParagonPropertyWithMedia>> {
    const encodedZipCode = encodeURIComponent(zipCode);
    const url = `${this.__baseUrl}/Property?$count=true&$filter=StandardStatus eq 'Active' and contains(PostalCode, '${encodedZipCode}')`;

    const response = await this.get<ParagonPropertyWithMedia>(url);

    if (response.value && includeMedia) {
      response.value = await this.populatePropertyMedia(response.value);
    }

    return response;
  }

  public async searchByStreetName(): Promise<{
    '@odata.context': string;
    '@odata.nextLink': string;
    value: IParagonProperty[];
  }> {
    const url = `${this.__baseUrl}/Property?$filter=contains(StreetName, 'Kenosha')`;

    const headers: HeadersInit = {};
    headers['Accept'] = 'application/json';
    headers['Authorization'] = await this.__getAuthHeaderValue();

    const options: RequestInit = { method: 'GET', headers: headers };
    const response = await fetch(url, options);

    return await response.json();
  }

  public async getAllProperty(top?: number): Promise<IParagonProperty[]> {
    const url = this.getPropertyUrl(top ? top : this.__maxPageSize);
    console.log('Called getAllProperty. URL:', url);

    const response = await this.get<IParagonProperty>(url);

    if (!top) {
      const count = response['@odata.count'];

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

  public async getAllPropertyWithMedia(
    top?: number,
    limit: number = 0
  ): Promise<IParagonProperty[]> {
    if (process.env.MOCK_DATA && process.env.MOCK_DATA === 'true') {
      console.log('Using mock data for getAllPropertyWithMedia');
      const properties_mock = require('../../data/properties.json');
      // await new Promise((resolve) => setTimeout(resolve, 3000));

      return await geocodeProperties(properties_mock.value);
    }

    const properties: ParagonPropertyWithMedia[] = await this.getAllProperty(
      top
    );

    const [withMedia, withGeocoding] = await Promise.all([
      this.populatePropertyMedia(properties, limit),
      geocodeProperties(properties),
    ]);

    return withMedia.map((property, index) => {
      property.Latitude = withGeocoding[index].Latitude;
      property.Longitude = withGeocoding[index].Longitude;
      return property;
    });
  }
}

const RESO_BASE_URL = process.env.RESO_BASE_URL ?? '';
const RESO_TOKEN_URL = process.env.RESO_TOKEN_URL ?? '';
const RESO_CLIENT_ID = process.env.RESO_CLIENT_ID ?? '';
const RESO_CLIENT_SECRET = process.env.RESO_CLIENT_SECRET ?? '';

const paragonApiClient = new ParagonApiClient(
  RESO_BASE_URL,
  RESO_TOKEN_URL,
  RESO_CLIENT_ID,
  RESO_CLIENT_SECRET
);

export default paragonApiClient;
