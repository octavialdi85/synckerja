/**
 * After `npx cap sync`, Capacitor regenerates android/app/src/main/assets/capacitor.plugins.json
 * from npm dependencies only. Re-append local app plugins so the bridge exposes them to JS.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginsPath = path.join(
  __dirname,
  "../android/app/src/main/assets/capacitor.plugins.json"
);

const LOCAL_PLUGINS = [
  { pkg: "synckerja-zoom-disable", classpath: "id.synckerja.app.ZoomDisablePlugin" },
  { pkg: "synckerja-safe-area-insets", classpath: "id.synckerja.app.SafeAreaInsetsPlugin" },
  { pkg: "synckerja-no-overscroll", classpath: "id.synckerja.app.NoOverscrollPlugin" },
  { pkg: "synckerja-share-intent", classpath: "id.synckerja.app.ShareIntentPlugin" },
];

if (!fs.existsSync(pluginsPath)) {
  console.warn("patch-android-capacitor-plugins: skip, file missing:", pluginsPath);
  process.exit(0);
}

const raw = fs.readFileSync(pluginsPath, "utf8");
const json = JSON.parse(raw);
const seen = new Set(json.map((p) => p.classpath));
let added = 0;
for (const p of LOCAL_PLUGINS) {
  if (!seen.has(p.classpath)) {
    json.push({ ...p });
    seen.add(p.classpath);
    added++;
  }
}
fs.writeFileSync(pluginsPath, JSON.stringify(json, null, "\t") + "\n");
if (added > 0) {
  console.log(`patch-android-capacitor-plugins: appended ${added} local plugin(s).`);
} else {
  console.log("patch-android-capacitor-plugins: local plugins already present.");
}
