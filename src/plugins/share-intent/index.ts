import { registerPlugin } from "@capacitor/core";
import type { ShareIntentPlugin } from "./definitions";
import { ShareIntentWeb } from "./web";

export * from "./definitions";

export const ShareIntent = registerPlugin<ShareIntentPlugin>("ShareIntent", {
  web: () => new ShareIntentWeb(),
});
