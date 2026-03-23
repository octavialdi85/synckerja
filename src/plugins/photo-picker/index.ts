import { registerPlugin } from "@capacitor/core";
import type { PhotoPickerPlugin } from "./definitions";
import { PhotoPickerWeb } from "./web";

export * from "./definitions";

export const PhotoPicker = registerPlugin<PhotoPickerPlugin>("PhotoPicker", {
  web: () => new PhotoPickerWeb(),
});
