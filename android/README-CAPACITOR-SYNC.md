# Android + Capacitor sync

Custom native plugins (`ZoomDisablePlugin`, `SafeAreaInsetsPlugin`, `NoOverscrollPlugin`, `ShareIntentPlugin`) are registered in `MainActivity` **before** `super.onCreate()` and listed in `capacitor.plugins.json` after a post-sync step.

- Prefer **`npm run cap:sync`** or **`npm run cap:sync:android`** (runs `cap sync` then `scripts/patch-android-capacitor-plugins.mjs`).
- If you run **`npx cap sync android` alone**, re-run **`node scripts/patch-android-capacitor-plugins.mjs`** so local plugins stay in `app/src/main/assets/capacitor.plugins.json`.

Then rebuild the app in Android Studio (Build → Rebuild Project).
