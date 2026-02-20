import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import removeConsole from "vite-plugin-remove-console";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 8080,
    historyApiFallback: true,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // Remove console.log/info/debug in production, but keep console.error/warn
    mode === "production" && removeConsole({
      includes: ['log', 'info', 'debug'], // Only remove these; error and warn are kept
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
