import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Registo do Service Worker (Vite PWA)
import { registerSW } from 'virtual:pwa-register';

// Regista SW com atualização automática
try {
  registerSW({ immediate: true });
} catch {}

// Env logs removidos para segurança

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
