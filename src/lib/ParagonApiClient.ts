import IParagonProperty from "@/types/IParagonProperty";
import * as url from "url";

interface ITokenResponse {
    token_type: "Bearer";
    access_token: string;
    expires_in: number;
}

export default class ParagonApiClient {
    private __baseUrl: string;
    private __tokenType: "Basic" | "Bearer";
    private __accessToken: string;

    constructor(baseUrl: string, token: string, tokenType: "Basic" | "Bearer") {
        this.__baseUrl = baseUrl;
        this.__accessToken = token;
        this.__tokenType = tokenType;
    }

    // Initialize with a client secret. Will get an access token from the token server...
    public static async forClientSecret(baseUrl: string, tokenUrl: string, clientId: string, clientSecret: string): Promise<ParagonApiClient> {
        // Body...
        const body = new url.URLSearchParams();
        body.append('grant_type', 'client_credentials');
        body.append('scope', "OData");

        // Headers...
        const token = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const headers: HeadersInit = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        headers["Accept"] = "application/json";
        headers["Authorization"] = `Basic ${token}`;

        // Make the request and return the JSON...
        const options: RequestInit = { method: "POST", headers: headers, body: body };
        const response = await fetch(tokenUrl, options);
        const tokenResponse = await response.json() as ITokenResponse;

        return ParagonApiClient.forBearerToken(baseUrl, tokenResponse.access_token);
    }

    // Initialize with a known Bearer token...
    public static forBearerToken(baseUrl: string, accessToken: string): ParagonApiClient {
        return new ParagonApiClient(baseUrl, accessToken, "Bearer");
    }

    // Get the value to be used as the "Authorization" header...
    private __getAuthHeaderValue(): string {
        return `${this.__tokenType} ${this.__accessToken}`;
    }



    // Just used for testing...
    public async getAllProperty(): Promise<{ "@odata.context": string, "@odata.nextLink": string, value: IParagonProperty[] }> {
        const url = `${this.__baseUrl}/Property`;

        const headers: HeadersInit = {};
        headers["Accept"] = "application/json";
        headers["Authorization"] = this.__getAuthHeaderValue();

        const options: RequestInit = { method: "GET", headers: headers };
        const response = await fetch(url, options);
        return await response.json();
    }

    public async searchByStreetName(): Promise<{ "@odata.context": string, "@odata.nextLink": string, value: IParagonProperty[] }> {
        const url = `${this.__baseUrl}/Property?$filter=contains(StreetName, 'Kenosha')`;

        const headers: HeadersInit = {};
        headers["Accept"] = "application/json";
        headers["Authorization"] = this.__getAuthHeaderValue();

        const options: RequestInit = { method: "GET", headers: headers };
        const response = await fetch(url, options);
        return await response.json();
    }

    public async searchByZipCode(zipCode: string): Promise<{ "@odata.context": string, "@odata.nextLink": string, value: IParagonProperty[] }> {
        const url = `${this.__baseUrl}/Property?$filter=contains(PostalCode, '${zipCode}')`;

        const headers: HeadersInit = {};
        headers["Accept"] = "application/json";
        headers["Authorization"] = this.__getAuthHeaderValue();

        const options: RequestInit = { method: "GET", headers: headers };
        const response = await fetch(url, options);
        return await response.json();
    }

}