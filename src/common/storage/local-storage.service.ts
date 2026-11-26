import { Injectable, Logger } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  extensionFor,
  ImageStorageService,
  type StoredImage,
  type UploadedImage,
} from './image-storage.service.js';

/** Directory that holds uploaded files, relative to the API root. */
export const UPLOADS_DIR = 'uploads';
export const EVENT_IMAGES_URL_PREFIX = `/${UPLOADS_DIR}/events`;

/**
 * Stores images on local disk under `uploads/events`. Fine for development
 * and single-instance hosts with a persistent volume; use the Cloudinary
 * driver when the filesystem is ephemeral or shared across instances.
 */
@Injectable()
export class LocalStorageService extends ImageStorageService {
  private readonly logger = new Logger(LocalStorageService.name);

  private readonly eventsDir = join(process.cwd(), UPLOADS_DIR, 'events');

  get publicBaseUrl(): string {
    return (
      process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`
    ).replace(/\/+$/, '');
  }

  async save(eventId: string, file: UploadedImage): Promise<StoredImage> {
    await mkdir(this.eventsDir, { recursive: true });

    const filename = `${eventId}-${randomUUID()}${extensionFor(file.mimetype)}`;
    await writeFile(join(this.eventsDir, filename), file.buffer);

    return {
      url: `${this.publicBaseUrl}${EVENT_IMAGES_URL_PREFIX}/${filename}`,
      publicId: filename,
    };
  }

  async remove(publicId: string | null | undefined): Promise<void> {
    if (!publicId) return;

    // Only a bare file name inside the events folder may be removed.
    if (
      publicId.includes('/') ||
      publicId.includes('\\') ||
      publicId.includes('..')
    ) {
      return;
    }

    try {
      await unlink(join(this.eventsDir, publicId));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Could not remove ${publicId}: ${String(error)}`);
      }
    }
  }
}
