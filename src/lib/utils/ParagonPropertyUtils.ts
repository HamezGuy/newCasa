import IParagonProperty from "@/types/IParagonProperty";
import IParagonMedia, { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import paragonApiClient from "@/lib/ParagonApiClient"; // ADDED for fallback fetch

export default class ParagonPropertyUtils {
  /**
   * For a property with open house times in "Open_House_Time" or
   * "Open_House_Time_2" fields, e.g. "11:00-1:00",
   * we'll return something like "11am". This logic is simplified.
   */
  public static getOpenHouseTime(property: IParagonProperty): string {
    let sTime = "";
    if (!!property.Open_House_Time) {
      sTime = property.Open_House_Time;
    } else if (!!property.Open_House_Time_2) {
      sTime = property.Open_House_Time_2;
    }
    if (!sTime) return "";

    // e.g. "11:00-1:00"
    const sTimeParts = sTime.split("-");
    const sStartTime = sTimeParts[0]; // "11:00"
    const sStartTimeParts = sStartTime.split(":"); // ["11","00"]
    const nStartTime = parseInt(sStartTimeParts[0]);
    const sStartTimeSuffix = nStartTime >= 12 ? "pm" : "am";

    return `${sStartTime}${sStartTimeSuffix}`;
  }

  /**
   * Utility to format the full street address from the property.
   */
  public static formatStreetAddress(property: IParagonProperty): string {
    const { StreetDirPrefix, StreetName, StreetNumber, StreetSuffix, UnitNumber } = property;

    let sAddress = "";
    if (!!StreetNumber) sAddress += StreetNumber + " ";
    if (!!StreetDirPrefix) sAddress += StreetDirPrefix + " ";
    if (!!StreetName) sAddress += StreetName + " ";
    if (!!StreetSuffix) sAddress += StreetSuffix;
    if (!!UnitNumber) sAddress += " #" + UnitNumber;
    return sAddress.trim();
  }

  /**
   * Utility to format "City, State Zip" from the property,
   * or fallback to PostalCity if City is missing.
   */
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
    return sCityStateZip.trim();
  }
}

/**
 * Returns the "primary" photo from property.Media.
 *  1) If any item has Order === 0 => return it immediately.
 *  2) Otherwise return whichever has the smallest Order (defaulting to 99999).
 *  3) If no media => fallback => fetch property by ID, and pick first image from that result.
 */
export const getPrimaryPhoto = async (
  property: ParagonPropertyWithMedia
): Promise<IParagonMedia | null> => {
  const media = property.Media || [];
  console.log(
    `[getPrimaryPhoto] => ListingId=${property.ListingId} => rawMedia.length=${media.length}`
  );

  // If .Media is empty => try a fallback fetch from server
  if (media.length === 0) {
    console.log("[getPrimaryPhoto] => No media => attempting fallback fetch by ID...");
    const updatedMedia = await tryFetchMediaForListing(property.ListingId);
    if (updatedMedia && updatedMedia.length > 0) {
      console.log(
        `[getPrimaryPhoto] => Fallback succeeded => updatedMedia.length=${updatedMedia.length}`
      );
      return pickPrimaryPhoto(updatedMedia);
    }
    console.log("[getPrimaryPhoto] => Fallback also failed => returning null.");
    return null;
  }

  // Filter out items without a valid MediaURL
  const validMedia = media.filter((m) => !!m.MediaURL);
  console.log(`[getPrimaryPhoto] => validMedia.length=${validMedia.length}`);

  if (validMedia.length === 0) {
    console.log(
      "[getPrimaryPhoto] => All items had blank MediaURL => attempting fallback fetch by ID..."
    );
    const updatedMedia = await tryFetchMediaForListing(property.ListingId);
    if (updatedMedia && updatedMedia.length > 0) {
      console.log(
        `[getPrimaryPhoto] => Fallback succeeded => updatedMedia.length=${updatedMedia.length}`
      );
      return pickPrimaryPhoto(updatedMedia);
    }
    console.log("[getPrimaryPhoto] => Still no valid images => returning null.");
    return null;
  }

  // Check if any item has Order === 0 => immediate primary
  const zeroOrder = validMedia.find((m) => m.Order === 0);
  if (zeroOrder) {
    console.log("[getPrimaryPhoto] => Found item with Order=0 => returning it.");
    return zeroOrder;
  }

  // Otherwise pick the smallest Order
  return pickPrimaryPhoto(validMedia);
};

// Small helper => picks the item with smallest Order
function pickPrimaryPhoto(mediaArray: IParagonMedia[]): IParagonMedia | null {
  if (!mediaArray.length) return null;
  let mainIndex = 0;
  let minOrder = Number.MAX_SAFE_INTEGER;

  for (let i = 0; i < mediaArray.length; i++) {
    const item = mediaArray[i];
    const orderValue = item.Order ?? 99999;
    if (orderValue < minOrder) {
      minOrder = orderValue;
      mainIndex = i;
    }
  }
  const chosen = mediaArray[mainIndex] || null;
  console.log(
    `[pickPrimaryPhoto] => Chose item with smallest order=${minOrder}, MediaKey=${chosen?.MediaKey}`
  );
  return chosen;
}

// Fallback => tries to fetch the property by ID => returns sorted array of media
async function tryFetchMediaForListing(listingId?: string): Promise<IParagonMedia[] | null> {
  if (!listingId) {
    console.log("[tryFetchMediaForListing] => No listingId => returning null");
    return null;
  }
  try {
    console.log(`[tryFetchMediaForListing] => Attempting fallback fetch for ID=${listingId}`);
    // We'll call your single-property approach that does a single Media query
    const singleProp = await paragonApiClient.getPropertyById(listingId, true);

    // If that returned a property with .Media, we sort & return
    const p = singleProp as ParagonPropertyWithMedia;
    const feed = p?.Media || [];
    if (feed.length === 0) {
      return null;
    }

    // Filter out blank, remove duplicates, sort by order
    const filtered = feed
      .filter((m) => !!m.MediaURL)
      .reduce((acc: IParagonMedia[], item) => {
        if (!acc.find((x) => x.MediaKey === item.MediaKey)) {
          acc.push(item);
        }
        return acc;
      }, [])
      .sort((a, b) => {
        const aO = a.Order ?? 99999;
        const bO = b.Order ?? 99999;
        return aO - bO;
      });

    return filtered;
  } catch (error) {
    console.error("[tryFetchMediaForListing] => error fetching fallback listing:", error);
    return null;
  }
}
