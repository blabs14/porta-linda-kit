import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import visualizer from 'vite-bundle-visualizer';

// Wrapper personalizado para componentTagger que exclui React.Fragment
function createSafeComponentTagger() {
  const originalTagger = componentTagger();
  
  return {
    ...originalTagger,
    transform(code: string, id: string) {
      // Só processa ficheiros JSX/TSX
      if (!id.endsWith('.jsx') && !id.endsWith('.tsx')) {
        return originalTagger.transform?.(code, id);
      }
      
      // Aplica o tagger original
      const result = originalTagger.transform?.(code, id);
      
      if (typeof result === 'string') {
        // Remove data-lov-id de React.Fragment
        return result.replace(
          /<React\.Fragment([^>]*?)\s+data-lov-id="[^"]*"([^>]*?)>/g,
          '<React.Fragment$1$2>'
        ).replace(
          /<>([^>]*?)\s+data-lov-id="[^"]*"([^>]*?)>/g,
          '<>$1$2>'
        );
      }
      
      return result;
    }
  };
}

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
      mode === "development" && createSafeComponentTagger(), // Wrapper seguro que exclui React.Fragment
      VitePWA({
        registerType: "autoUpdate",
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        devOptions: {
          enabled: true,
          suppressWarnings: true,
          type: 'module',
        },
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
      // Visualizador de bundle (ativar com VISUALIZE=1)
      process.env.VISUALIZE === '1' && ((visualizer as any)({ template: 'treemap' }) as any),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/recharts')) return 'charts';
            if (id.includes('/node_modules/jspdf')) return 'pdf';
            if (id.includes('/node_modules/xlsx')) return 'excel';
            if (id.includes('/node_modules/html2canvas')) return 'html2canvas';

            // Dividir vendor em subgrupos
            if (id.includes('/node_modules/@tanstack/react-query')) return 'react-query';
            if (id.includes('/node_modules/lucide-react')) return 'icons';
            if (id.includes('/node_modules/react-router-dom') || id.includes('/node_modules/react-router')) return 'router';
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'react-vendor';

            if (id.includes('/src/pages/reports.tsx') || id.includes('/src/components/ReportExport.tsx') || id.includes('/src/components/ReportChart.tsx')) return 'reports';
            // Family: chunks por sub-rotas
            if (id.includes('/src/pages/Family.tsx')) return 'family-shell';
            if (id.includes('/src/features/family/FamilyDashboard.tsx')) return 'family-dashboard';
            if (id.includes('/src/features/family/FamilyAccounts.tsx')) return 'family-accounts';
            if (id.includes('/src/features/family/FamilyTransactions.tsx')) return 'family-transactions';
            if (id.includes('/src/features/family/FamilyGoals.tsx')) return 'family-goals';
            if (id.includes('/src/features/family/FamilyBudgets.tsx')) return 'family-budgets';
            if (id.includes('/src/features/family/FamilyMembers.tsx')) return 'family-members';
            if (id.includes('/src/features/family/FamilySettings.tsx')) return 'family-settings';
            if (id.includes('/src/features/personal/') || id.includes('/src/pages/Personal')) return 'personal';
            if (id.includes('/src/pages/Insights.tsx')) return 'insights';
            if (id.includes('/src/features/personal/PersonalSettings')) return 'settings';
          },
        },
      },
      // Hints simples de budget (não falham o build): logar quando chunks excedem valores alvo
      chunkSizeWarningLimit: 700, // ~700KB por chunk (antes de gzip)
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
