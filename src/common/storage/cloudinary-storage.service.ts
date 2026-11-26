import { Injectable, Logger } from '@nestjs/common';
import cloudinary, { type UploadApiResponse } from 'cloudinary';
import {
  ImageStorageService,
  type StoredImage,
  type UploadedImage,
} from './image-storage.service.js';

const FOLDER = 'going/events';

/**
 * Uploads images to Cloudinary and keeps its public id so they can be
 * deleted later. Used when STORAGE_DRIVER=cloudinary.
 */
@Injectable()
export class CloudinaryStorageService extends ImageStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor() {
    super();

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'STORAGE_DRIVER=cloudinary needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET',
      );
    }

    cloudinary.v2.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  async save(_eventId: string, file: UploadedImage): Promise<StoredImage> {
    const result = await this.upload(file);

    return { url: result.secure_url, publicId: result.public_id };
  }

  async remove(publicId: string | null | undefined): Promise<void> {
    if (!publicId) return;

    try {
      await cloudinary.v2.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      // A failed delete must not fail the request that triggered it.
      this.logger.warn(`Could not delete ${publicId}: ${String(error)}`);
    }
  }

  private upload(file: UploadedImage): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        { folder: FOLDER, resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary returned no result'));
          resolve(result);
        },
      );

      stream.end(file.buffer);
    });
  }
}
