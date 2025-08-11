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

function getShortcutItems(pathname: string) {
  const items: { key: string; action: string }[] = [
    { key: '/', action: 'Focar campo principal da página' },
    { key: '?', action: 'Abrir/Fechar ajuda de atalhos' },
  ];
  if (pathname.startsWith('/personal/transactions')) {
    items.push({ key: '/', action: 'Focar pesquisa de transações (Pessoal)' });
  } else if (pathname.startsWith('/family/transactions')) {
    items.push({ key: '/', action: 'Focar pesquisa de transações (Família)' });
  } else if (pathname.startsWith('/reports')) {
    items.push({ key: '/', action: 'Focar Data Início' });
  } else if (pathname.startsWith('/insights')) {
    items.push({ key: '/', action: 'Focar botão Exportar' });
  } else if (pathname.startsWith('/personal/budgets')) {
    items.push({ key: '/', action: 'Focar filtro de mês (Pessoal)' });
  } else if (pathname.startsWith('/family/budgets')) {
    items.push({ key: '/', action: 'Focar filtro de mês (Família)' });
  } else if (pathname.startsWith('/family/members')) {
    items.push({ key: '/', action: 'Abrir modal de convite e focar email' });
  }
  return items;
}

export const GlobalShortcuts: React.FC = () => {
  const location = useLocation();
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable === true
      );

      // Toggle ajuda com '?' (Shift+/ em muitos layouts)
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      if (showHelp && e.key === 'Escape') {
        e.preventDefault();
        setShowHelp(false);
        return;
      }

      if (showHelp) return; // não executar outros atalhos com a ajuda aberta

      if (e.key !== '/') return;
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
  }, [location.pathname, showHelp]);

  const items = getShortcutItems(location.pathname);

  return (
    <>
      {/* Botão flutuante para ajuda */}
      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        aria-label="Ajuda de atalhos"
        title="Ajuda de atalhos (?)"
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full border bg-background text-foreground shadow hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        ?
      </button>

      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcut-help-title"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHelp(false)} />
          <div className="relative bg-white dark:bg-neutral-900 border border-border rounded-lg shadow-xl w-[90vw] max-w-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 id="shortcut-help-title" className="text-lg font-semibold">Atalhos de Teclado</h2>
              <button
                onClick={() => setShowHelp(false)}
                aria-label="Fechar ajuda"
                className="px-2 py-1 text-sm rounded border hover:bg-muted"
              >
                Fechar
              </button>
            </div>
            <ul className="space-y-2">
              {items.map((it, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <kbd className="px-2 py-1 border rounded bg-muted text-sm">{it.key}</kbd>
                  <span className="text-sm">{it.action}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-muted-foreground">
              Dica: o atalho "/" é ignorado enquanto estás a escrever num campo.
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 