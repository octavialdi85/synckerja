export interface PhotoPickerFile {
  path: string;
  name: string;
  mimeType: string;
}

export interface PhotoPickerResult {
  files: PhotoPickerFile[];
}

export type PhotoPickerMediaType = "imageOnly" | "imageAndVideo";

export interface PhotoPickerPlugin {
  pickMedia(options: { maxItems?: number; mediaType?: PhotoPickerMediaType }): Promise<PhotoPickerResult>;
}
