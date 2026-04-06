import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_URL = "https://your-backend.onrender.com/api/";
// const API_URL = "http://127.0.0.1:8000/api/";
// https://vite.dev/config/
export default defineConfig({
  
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: API_URL,
        changeOrigin: true,
      },
      "/closure-period": {
        target: API_URL,
        changeOrigin: true,
      },
      "/ideas": {
        target: API_URL,
        changeOrigin: true,
      },
      "/media": {
        target: API_URL,
        changeOrigin: true,
      },
    },
  },
});
