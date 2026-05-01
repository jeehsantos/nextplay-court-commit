import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor code into stable, cache-friendly chunks so users don't
        // re-download React/Radix/Supabase on every app deploy.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@stripe") || id.includes("/stripe-js")) return "vendor-stripe";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
            return "vendor-forms";
          }
          return "vendor";
        },
      },
    },
  },
}));
