import React from 'react';
import { useLocation } from 'react-router-dom';

function focusBySelector(selector: string): boolean {
  const el = document.querySelector<HTMLElement>(selector);
  if (el) {
    el.focus();
    return true;
  }
  return false;
}

function tryFocusCandidates(selectors: string[]): boolean {
  for (const sel of selectors) {
    if (focusBySelector(sel)) return true;
  }
  return false;
}

export const GlobalShortcuts: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const isTyping = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable === true
      );
      if (isTyping) return;

      e.preventDefault();

      const path = location.pathname;
      const candidates: string[] = [];

      // Roteamento específico
      if (path.startsWith('/personal/transactions')) {
        candidates.push('#personal-tx-search');
      } else if (path.startsWith('/family/transactions')) {
        candidates.push('#family-tx-search');
      } else if (path.startsWith('/reports')) {
        candidates.push('#reports-start-date');
      } else if (path.startsWith('/insights')) {
        candidates.push('#insights-export-btn');
      } else if (path.startsWith('/personal/budgets')) {
        candidates.push('#personal-budgets-month');
      } else if (path.startsWith('/family/budgets')) {
        candidates.push('#family-budgets-month');
      } else if (path.startsWith('/family/members')) {
        // Tentar focar email; se não existir, abrir modal e focar a seguir
        if (!focusBySelector('#invite-email')) {
          const openBtn = document.querySelector<HTMLButtonElement>('button[aria-describedby="family-invite-hint"]');
          openBtn?.click();
          setTimeout(() => {
            focusBySelector('#invite-email');
          }, 0);
        }
      }

      // Fallbacks genéricos
      candidates.push(
        'input[type="search"]',
        'input[placeholder*="Pesquisar" i]',
        'input[aria-describedby*="search-hint" i]',
        'input',
        'button'
      );

      tryFocusCandidates(candidates);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [location.pathname]);

  return null;
}; 