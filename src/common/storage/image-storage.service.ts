/** The parts of a multipart upload this app cares about. */
export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/** A stored image: where it can be fetched, and how to delete it later. */
export interface StoredImage {
  url: string;
  publicId: string;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Upper bound on gallery images per event. */
export const MAX_GALLERY_IMAGES = 10;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function isAllowedImage(mimetype: string): boolean {
  return mimetype in ALLOWED_IMAGE_TYPES;
}

/** File extension for an allowed MIME type; never taken from the client. */
export function extensionFor(mimetype: string): string {
  return ALLOWED_IMAGE_TYPES[mimetype];
}

/**
 * Where event images live. Two drivers implement this: local disk for
 * development, Cloudinary for deployments. Callers only see URLs and ids.
 */
export abstract class ImageStorageService {
  abstract save(eventId: string, file: UploadedImage): Promise<StoredImage>;

  abstract remove(publicId: string | null | undefined): Promise<void>;
}
