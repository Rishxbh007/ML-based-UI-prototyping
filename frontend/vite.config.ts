import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite configuration for the Morph platform frontend.
// The "@" alias keeps imports clean (e.g. "@/components/ui/Button").
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to the FastAPI backend during development so the
    // frontend can call "/api/..." without hardcoding the backend origin.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
