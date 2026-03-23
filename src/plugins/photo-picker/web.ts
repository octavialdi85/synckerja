import type { PhotoPickerPlugin, PhotoPickerResult } from "./definitions";

export class PhotoPickerWeb implements PhotoPickerPlugin {
  async pickMedia(): Promise<PhotoPickerResult> {
    return { files: [] };
  }
}
