import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Registo do Service Worker (Vite PWA)
import { registerSW } from 'virtual:pwa-register';

const isDev = import.meta.env.DEV;

// Em produção, regista o SW; em desenvolvimento, garante que não há SW ativos e limpa caches
if (!isDev) {
  try {
    registerSW({ immediate: true });
  } catch {}
} else if ('serviceWorker' in navigator) {
  (async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(k => /(workbox|vite-pwa|supabase)/i.test(k))
            .map(k => caches.delete(k))
        );
      }
      // Limpar tokens de sessão Supabase antigos para evitar "Invalid Refresh Token" em dev
      try {
        const toDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) ?? '';
          if (/^(sb-|supabase\.)/i.test(k)) toDelete.push(k);
        }
        toDelete.forEach(k => localStorage.removeItem(k));
      } catch {}

      console.info('[dev] Service workers desativados, caches e tokens Supabase limpos.');
    } catch (e) {
      console.warn('[dev] Falha ao desativar service workers ou limpar caches:', e);
    }
  })();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
