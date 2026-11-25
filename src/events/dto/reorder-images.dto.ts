import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ReorderImagesDto {
  /**
   * Every image id of the event, in the order they should display.
   * @example ["2f7c5b91-3a8d-42e6-b417-8c9d0e1f2a3b","5a1e9c47-8b2f-4d63-9e80-1f2a3b4c5d6e"]
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  imageIds: string[];
}
