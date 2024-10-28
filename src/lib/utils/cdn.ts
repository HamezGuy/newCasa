import IParagonMedia from '@/types/IParagonMedia';

interface CloudinaryConfig {
  config: (configUrl: string | undefined) => void;
  uploader: {
    upload: (
      path: string,
      options: {
        folder: string;
        public_id: string;
      }
    ) => Promise<{ url: string }>;
  };
  api: {
    resources_by_asset_folder: (
      path: string,
      options: { max_results: number }
    ) => Promise<{ resources: { secure_url: string }[] }>;
    sub_folders: (path: string) => Promise<{ folders: { name: string }[] }>;
    delete_all_resources: (options: { resource_type: string }) => Promise<void>;
  };
}

let cloudinary: CloudinaryConfig | undefined;

if (typeof window === 'undefined') {
  cloudinary = require('cloudinary').v2;

  if (cloudinary && process.env.CLOUDINARY_URL) {
    cloudinary.config(process.env.CLOUDINARY_URL);
  }
}

export const cdn = {
  async uploadMedia(media: IParagonMedia[] | undefined): Promise<IParagonMedia[]> {
    // Check if media is undefined or empty
    if (!media || !Array.isArray(media) || media.length === 0) {
      console.warn('No media items provided for upload.');
      return [];
    }

    if (!cloudinary || !process.env.CLOUDINARY_URL) {
      console.warn(
        'Cloudinary config not set or not available on the client. Using source image URLs.'
      );
      return media;
    }

    const uploadResults = media.map(async (mediaItem) => {
      if (!mediaItem.MediaURL) return mediaItem;

      const imageUrl = mediaItem.MediaURL.startsWith('http')
        ? mediaItem.MediaURL
        : `https:${mediaItem.MediaURL}`;

      try {
        const uploadResult = await cloudinary!.uploader.upload(imageUrl, {
          folder: `property/${mediaItem.ResourceRecordKey}`,
          public_id: mediaItem.Order.toString(),
        });
        mediaItem.MediaURL = uploadResult.url;
        return mediaItem;
      } catch (error) {
        console.error(`Error uploading media ${imageUrl}:`, error);
        return mediaItem;
      }
    });

    const results = await Promise.all(uploadResults);
    return results.filter((item) => item.MediaURL);
  },

  async getMedia(propertyId: string): Promise<IParagonMedia[]> {
    if (!cloudinary) {
      console.warn('Cloudinary is only available on the server.');
      return [];
    }

    try {
      const result = await cloudinary!.api.resources_by_asset_folder(
        `property/${propertyId}`,
        { max_results: 20 }
      );
      return result.resources.map((resource) => ({
        MediaURL: resource.secure_url,
      }));
    } catch (error) {
      console.error(`Error fetching media for property ${propertyId}:`, error);
      return [];
    }
  },

  async getProperties(): Promise<string[]> {
    if (!cloudinary) {
      console.warn('Cloudinary is only available on the server.');
      return [];
    }

    try {
      const result = await cloudinary!.api.sub_folders('property');
      return result.folders.map((folder) => folder.name);
    } catch (error) {
      console.error('Error listing subfolders in /property:', error);
      return [];
    }
  },

  async clearCDN() {
    if (!cloudinary) {
      console.warn('Cloudinary is only available on the server.');
      return;
    }

    try {
      await cloudinary!.api.delete_all_resources({ resource_type: 'image' });
    } catch (error) {
      console.error('Error clearing CDN resources:', error);
    }
  },
};
