import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  server: {
    proxy: {
      // Proxy GAS to avoid browser CORS in dev
      "/gas": {
        target:
          "https://script.google.com/macros/s/AKfycbxqx00B7oSgwGlyCgUb1ONM-lBc-xuQUb1ykUIfY_rdZIK8l1xDN_AnSA66gONNBSdH/exec",
        changeOrigin: true,
        secure: true,
        // Rewrite '/gas' to '' so '/gas?x=y' -> '.../exec?x=y'
        rewrite: (path) => path.replace(/^\/gas/, ""),
      },
    },
  },
});
