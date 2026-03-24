/**
 * After `npx cap sync`, Capacitor regenerates android/app/src/main/assets/capacitor.plugins.json
 * from npm dependencies only. Re-append local app plugins so the bridge exposes them to JS.
 * Also strips `flatDir` from the Cordova plugins Gradle file when Capacitor rewrites it (Gradle warns).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginsPath = path.join(
  __dirname,
  "../android/app/src/main/assets/capacitor.plugins.json"
);
const cordovaPluginsGradle = path.join(
  __dirname,
  "../android/capacitor-cordova-android-plugins/build.gradle"
);
const androidPublicPluginsDir = path.join(
  __dirname,
  "../android/app/src/main/assets/public/plugins"
);
const androidPublicPluginsPlaceholderJs = path.join(androidPublicPluginsDir, "placeholder.js");
const androidPublicPluginsReadme = path.join(androidPublicPluginsDir, "README.txt");

const LOCAL_PLUGINS = [
  { pkg: "synckerja-zoom-disable", classpath: "id.synckerja.app.ZoomDisablePlugin" },
  { pkg: "synckerja-safe-area-insets", classpath: "id.synckerja.app.SafeAreaInsetsPlugin" },
  { pkg: "synckerja-no-overscroll", classpath: "id.synckerja.app.NoOverscrollPlugin" },
  { pkg: "synckerja-share-intent", classpath: "id.synckerja.app.ShareIntentPlugin" },
];

if (fs.existsSync(pluginsPath)) {
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
} else {
  console.warn("patch-android-capacitor-plugins: skip plugins json, file missing:", pluginsPath);
}

if (fs.existsSync(cordovaPluginsGradle)) {
  let g = fs.readFileSync(cordovaPluginsGradle, "utf8");
  const before = g;
  // Cordova template re-inserts flatDir on cap sync; strip it (Gradle warns: no POM metadata).
  g = g.replace(/\s*flatDir\s*\{[^}]*\}/g, "");
  g = g.replace(/\n{3,}/g, "\n\n");
  if (g !== before) {
    fs.writeFileSync(cordovaPluginsGradle, g);
    console.log("patch-android-capacitor-plugins: removed flatDir from capacitor-cordova-android-plugins/build.gradle");
  }
}

// Keep public/plugins available for Capacitor WebView lookups to avoid noisy startup warning.
fs.mkdirSync(androidPublicPluginsDir, { recursive: true });
// Use a JS placeholder (not .txt) so nothing non-JS is accidentally parsed as script by WebView.
if (!fs.existsSync(androidPublicPluginsPlaceholderJs)) {
  fs.writeFileSync(
    androidPublicPluginsPlaceholderJs,
    "// Placeholder file to keep public/plugins directory available in Android assets.\n"
  );
  console.log("patch-android-capacitor-plugins: created public/plugins placeholder asset");
}
if (fs.existsSync(androidPublicPluginsReadme)) {
  fs.unlinkSync(androidPublicPluginsReadme);
}
