import IParagonProperty from "@/types/IParagonProperty";
import IParagonMedia, { ParagonPropertyWithMedia } from '@/types/IParagonMedia';

// This shouldn't be a class, modules in NodeJs already behave like a static class/helper
// And the import statement helps clarify the "scope" of the functions
export default class ParagonPropertyUtils {
    // Converts a string like "11:00-1:00" to "11am"...
    public static getOpenHouseTime(property: IParagonProperty): string {
        let sTime = "";
        if (!!property.Open_House_Time) { sTime = property.Open_House_Time; }
        else if (!!property.Open_House_Time_2) { sTime = property.Open_House_Time_2; }
        if (!sTime) { return ""; }

        const sTimeParts = sTime.split("-");
        const sStartTime = sTimeParts[0];
        const sStartTimeParts = sStartTime.split(":");
        const nStartTime = parseInt(sStartTimeParts[0]);
        const sStartTimeSuffix = nStartTime >= 12 ? "pm" : "am";
        return `${sStartTime}${sStartTimeSuffix}`;
    }

    // Formats the street address...
    public static formatStreetAddress(property: IParagonProperty): string {
        const { StreetDirPrefix, StreetName, StreetNumber, StreetSuffix, UnitNumber } = property;

        let sAddress = "";
        if (!!StreetNumber) { sAddress += StreetNumber + " "; }
        if (!!StreetDirPrefix) { sAddress += StreetDirPrefix + " "; }
        if (!!StreetName) { sAddress += StreetName + " "; }
        if (!!StreetSuffix) { sAddress += StreetSuffix; }
        if (!!UnitNumber) { sAddress += " #" + UnitNumber; }
        return sAddress;
    }

    // Formats the city, state, and zip code...
    public static formatCityStateZip(property: IParagonProperty): string {
        const { City, PostalCity, StateOrProvince, PostalCode } = property;

        let sCity: string = City ?? "";
        if (!sCity) {
            sCity = PostalCity ?? "";
        }

        let sCityStateZip = "";
        if (!!sCity) {
            sCityStateZip += sCity + ", ";
        }
        if (!!StateOrProvince) {
            sCityStateZip += StateOrProvince + " ";
        }
        if (!!PostalCode) {
            sCityStateZip += PostalCode;
        }
        return sCityStateZip;
    }
}

export const getPrimaryPhoto = (property: ParagonPropertyWithMedia): IParagonMedia | null => {
    if (!property.Media || property.Media.length===0) return null;

    let min=0;
    let mainImageIndex=0;

    for (const [index, media] of property.Media.entries()) {
        if (media.Order === 0) return media;

        if (media.Order < min){
            min = media.Order;
            mainImageIndex = index;
        }
    }

    return property.Media[mainImageIndex] ?? null;
}