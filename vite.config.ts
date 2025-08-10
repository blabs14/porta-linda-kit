import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

/// <reference types="vitest" />

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || "";

  let supabasePattern = /^https:\/\/.*supabase\.co\/.*$/i;
  try {
    if (supabaseUrl) {
      const host = new URL(supabaseUrl).host.replace(/\./g, "\\.");
      supabasePattern = new RegExp(`^https://${host}/.*`, "i");
    }
  } catch {
    // fallback mantém o padrão genérico *.supabase.co
  }

  // Base dinâmica para suportar GitHub Pages (ex.: /repo/) ou domínio próprio ("/")
  const viteBase = env.VITE_BASE_PATH && env.VITE_BASE_PATH.trim() !== ""
    ? env.VITE_BASE_PATH
    : "/";

  return {
    base: viteBase,
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        manifest: {
          name: "Porta Linda Kit",
          short_name: "PortaLinda",
          start_url: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#2563eb",
          icons: [
            { src: "/favicon.ico", sizes: "64x64 32x32 24x24 16x16", type: "image/x-icon" },
          ],
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: supabasePattern,
              handler: "NetworkFirst",
              method: "GET",
              options: { cacheName: "supabase-calls" },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              'react', 'react-dom',
              '@tanstack/react-query',
              'recharts',
              'lucide-react'
            ],
            reports: [
              './src/pages/reports.tsx',
              './src/components/ReportExport.tsx',
              './src/components/ReportChart.tsx'
            ]
          }
        }
      }
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/setupTests.ts"],
      css: true,
      reporters: ["verbose"],
      coverage: {
        reporter: ["text", "json", "html"],
        exclude: ["node_modules/", "src/setupTests.ts"],
      },
    },
  };
});
