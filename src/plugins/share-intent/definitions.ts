import type { PluginListenerHandle } from "@capacitor/core";

export interface ShareIntentFile {
  path: string;
  name: string;
  mimeType: string;
}

export interface ShareIntentPayload {
  files: ShareIntentFile[];
}

export interface ShareIntentPlugin {
  getPendingPayload(): Promise<ShareIntentPayload>;
  clearPending(): Promise<void>;
  addListener(
    eventName: "shareIntentReceived",
    listenerFunc: (payload: ShareIntentPayload) => void
  ): Promise<PluginListenerHandle>;
}
