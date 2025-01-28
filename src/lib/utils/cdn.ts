import IParagonMedia from "@/types/IParagonMedia";

/**
 * Cloudinary types for Node usage. 
 * If you have real "cloudinary" installed, typically:
 *   import { v2 as cloudinary } from "cloudinary";
 */
interface CloudinaryConfig {
  config: (configUrl: string | undefined) => void;
  uploader: {
    upload: (
      path: string,
      options: {
        folder: string;
        public_id: string;
        metadata: string;
      }
    ) => Promise<{ url: string }>;
  };
  api: {
    resources_by_asset_folder: (
      path: string,
      options: { fields: string; max_results: number }
    ) => Promise<{
      resources: { secure_url: string; public_id: string }[];
    }>;
    sub_folders: (path: string) => Promise<{ folders: { name: string }[] }>;
    delete_all_resources: (options: { resource_type: string }) => Promise<void>;
  };
}

let cloudinary: CloudinaryConfig | undefined;

// Only load Cloudinary on the server (Node).
if (typeof window === "undefined") {
  cloudinary = require("cloudinary").v2;

  if (cloudinary && process.env.CLOUDINARY_URL) {
    cloudinary.config(process.env.CLOUDINARY_URL);
    console.log("[cdn.ts] => Cloudinary configured with CLOUDINARY_URL.");
  } else {
    console.warn("[cdn.ts] => Cloudinary config not found or missing environment variable!");
  }
}

export const cdn = {
  /**
   * Uploads an array of media to Cloudinary (if configured).
   * If no Cloudinary config, we simply skip and return the original array.
   */
  async uploadMedia(
    media: IParagonMedia[] | undefined
  ): Promise<IParagonMedia[]> {
    console.log("[cdn.uploadMedia] => called with media length:", media?.length || 0);

    if (!media || !Array.isArray(media) || media.length === 0) {
      console.warn("[cdn.uploadMedia] => No media items to upload!");
      return [];
    }

    if (!cloudinary || !process.env.CLOUDINARY_URL) {
      console.warn("[cdn.uploadMedia] => Cloudinary config not set on server => returning original media");
      return media;
    }

    // Sort by Order, so we have a consistent sequence
    media.sort((a, b) => a.Order - b.Order);

    const uploadPromises = media.map(async (mediaItem) => {
      if (!mediaItem.MediaURL) {
        console.warn("[cdn.uploadMedia] => Media item has no MediaURL, skipping:", mediaItem);
        return mediaItem;
      }

      // If the URL doesn't start with http, prefix https
      const imageUrl = mediaItem.MediaURL.startsWith("http")
        ? mediaItem.MediaURL
        : `https:${mediaItem.MediaURL}`;

      console.log("[cdn.uploadMedia] => Attempting upload for:", imageUrl);

      try {
        const result = await cloudinary!.uploader.upload(imageUrl, {
          folder: `property/${mediaItem.ResourceRecordKey}`,
          public_id: mediaItem.Order.toString(),
          metadata: `order=${mediaItem.Order}`,
        });
        console.log("[cdn.uploadMedia] => Upload success => new URL:", result.url);
        // Overwrite the old MediaURL with the new Cloudinary URL
        mediaItem.MediaURL = result.url;
        return mediaItem;
      } catch (uploadError) {
        console.error("[cdn.uploadMedia] => Error uploading media item:", imageUrl, uploadError);
        return mediaItem; // fallback to original URL if it fails
      }
    });

    const results = await Promise.all(uploadPromises);
    // Filter out any item with no final MediaURL
    const finalMedia = results.filter((item) => item.MediaURL);
    console.log("[cdn.uploadMedia] => Final media count after upload:", finalMedia.length);

    return finalMedia;
  },

  /**
   * getMedia => retrieves existing images from Cloudinary based on subfolder
   */
  async getMedia(propertyId: string): Promise<IParagonMedia[]> {
    console.log("[cdn.getMedia] => called with propertyId:", propertyId);

    if (!cloudinary) {
      console.warn("[cdn.getMedia] => Cloudinary not available on server => returning empty array");
      return [];
    }

    try {
      const result = await cloudinary!.api.resources_by_asset_folder(
        `property/${propertyId}`,
        {
          fields: "public_id,secure_url,width,height,metadata",
          max_results: 20,
        }
      );

      console.log(
        "[cdn.getMedia] => resources_by_asset_folder => found count:",
        result.resources?.length || 0
      );

      // Sort by numeric portion of public_id => ex: "property/123/1" => parse '1'
      result.resources.sort((a, b) => {
        const orderA = parseInt(a.public_id.split("/").pop() || "0", 10);
        const orderB = parseInt(b.public_id.split("/").pop() || "0", 10);
        return orderA - orderB;
      });

      // Convert them into IParagonMedia
      return result.resources.map((r) => ({
        MediaURL: r.secure_url,
        // Possibly set others: e.g. Order, ...
      }));
    } catch (error) {
      console.error("[cdn.getMedia] => Error fetching media for property:", propertyId, error);
      return [];
    }
  },

  /**
   * getProperties => returns a list of sub-folders under /property
   */
  async getProperties(): Promise<string[]> {
    console.log("[cdn.getProperties] => listing sub_folders in 'property' folder");

    if (!cloudinary) {
      console.warn("[cdn.getProperties] => Cloudinary not available => returning []");
      return [];
    }

    try {
      const result = await cloudinary!.api.sub_folders("property");
      console.log("[cdn.getProperties] => found sub_folders:", result.folders?.length || 0);

      return result.folders.map((f) => f.name);
    } catch (error) {
      console.error("[cdn.getProperties] => error listing sub_folders:", error);
      return [];
    }
  },

  /**
   * clearCDN => delete all resources from the Cloudinary account
   */
  async clearCDN() {
    console.log("[cdn.clearCDN] => Called => removing all resources from Cloudinary");
    if (!cloudinary) {
      console.warn("[cdn.clearCDN] => Cloudinary not available => skipping");
      return;
    }
    try {
      await cloudinary!.api.delete_all_resources({ resource_type: "image" });
      console.log("[cdn.clearCDN] => Cleared all images from Cloudinary");
    } catch (error) {
      console.error("[cdn.clearCDN] => Error clearing all image resources:", error);
    }
  },
};
