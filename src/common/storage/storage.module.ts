import { Global, Module } from '@nestjs/common';
import { ImageStorageService } from './image-storage.service.js';
import { LocalStorageService } from './local-storage.service.js';
import { CloudinaryStorageService } from './cloudinary-storage.service.js';

/**
 * Picks the image backend from STORAGE_DRIVER. Defaults to local disk, so
 * development needs no Cloudinary account; production sets
 * STORAGE_DRIVER=cloudinary.
 */
@Global()
@Module({
  providers: [
    {
      provide: ImageStorageService,
      useFactory: () =>
        process.env.STORAGE_DRIVER === 'cloudinary'
          ? new CloudinaryStorageService()
          : new LocalStorageService(),
    },
  ],
  exports: [ImageStorageService],
})
export class StorageModule {}
