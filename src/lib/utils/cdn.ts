import IParagonMedia from '@/types/IParagonMedia';
import { v2 as cloudinary } from 'cloudinary';

export const cdn = {
  async uploadMedia(media: IParagonMedia[]): Promise<IParagonMedia[]> {
    if (!process.env.CLOUDINARY_URL) {
      console.error(
        'Cloudinary config not valid or set. Will use source image URLs'
      );
      return media;
    }

    // Iterate over each image URL and upload it to Cloudinary
    const uploadResults = media.map(async (media) => {
      if (!media.MediaURL) {
        return media;
      }

      const imageUrl = media.MediaURL.startsWith('http')
        ? media.MediaURL
        : `https:${media.MediaURL}`;

      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload(imageUrl, {
            asset_folder: 'property/' + media.ResourceRecordKey,
            public_id_prefix: media.Order,
            metadada: 'order=' + media.Order,
          })
          .then((uploadResult) => {
            media.MediaURL = uploadResult.url;
            resolve(uploadResult);
          })
          .catch((error) => {
            console.error(
              `Error fetching or uploading media ${media.MediaURL}:`,
              error
            );
            reject(error);
          });
      });
    });

    await Promise.allSettled(uploadResults);

    return media;
  },

  getMedia(propertyId: string): Promise<IParagonMedia[]> {
    return new Promise((resolve, reject) => {
      cloudinary.api
        .resources_by_asset_folder(`property/${propertyId}`, {
          fields: 'secure_url,width,height,metadata',
          metadata: true,
          max_results: 20,
        })
        .then((result) =>
          resolve(
            result.resources.map((r: any) => ({ MediaURL: r.secure_url }))
          )
        )
        .catch((err) => {
          console.log(
            `Error getting Media for property ${propertyId}`,
            err.error.message
          );
          resolve([]);
        });
    });
  },

  getProperties(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      cloudinary.api
        .sub_folders('property')
        .then((result) => resolve(result.folders.map((f: any) => f.name)))
        .catch((err) => {
          console.log(
            'Error listing subfolders in /property',
            err.error.message
          );
          resolve([]);
        });
    });
  },

  async clearCDN() {
    return await cloudinary.api.delete_all_resources({
      resource_type: 'image',
      type: 'upload',
    });
  },
};
