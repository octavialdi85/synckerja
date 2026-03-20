import { WebPlugin } from "@capacitor/core";
import type { ShareIntentPayload, ShareIntentPlugin } from "./definitions";

export class ShareIntentWeb extends WebPlugin implements ShareIntentPlugin {
  async getPendingPayload(): Promise<ShareIntentPayload> {
    return { files: [] };
  }

  async clearPending(): Promise<void> {
    // no-op on web
  }
}
