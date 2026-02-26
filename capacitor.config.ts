import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.synckerja.app',
  appName: 'Profitloop',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
    },
  },
};

export default config;
