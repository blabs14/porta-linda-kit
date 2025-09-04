import React from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Eraser, Save } from 'lucide-react';

interface TimesheetFooterProps {
  onFillNormalWeek: () => void;
  onClearWeek: () => void;
  onSave: () => void;
  isSaving?: boolean;
  // Aviso inline (texto já traduzido) a mostrar à esquerda
  notice?: string;
  // Mensagem para região aria-live (já traduzida)
  ariaLiveMessage?: string;
}

export function TimesheetFooter({ onFillNormalWeek, onClearWeek, onSave, isSaving, notice, ariaLiveMessage }: TimesheetFooterProps) {
  return (
    <div className="flex items-start justify-between gap-4" role="group" aria-label="Ações da folha de horas">
      {/* Região aria-live apenas para leitores de ecrã */}
      <div className="sr-only" aria-live="polite">{ariaLiveMessage || ''}</div>

      {/* Aviso inline à esquerda */}
      <div className="text-sm text-muted-foreground">
        {notice || ''}
      </div>

      {/* Botões à direita */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onFillNormalWeek} aria-label="Preencher semana normal">
          <Wand2 className="mr-2 h-4 w-4" /> Preencher Semana
        </Button>
        <Button variant="outline" onClick={onClearWeek} aria-label="Limpar todas as entradas">
          <Eraser className="mr-2 h-4 w-4" /> Limpar
        </Button>
        <Button onClick={onSave} disabled={isSaving} aria-label="Guardar folha de horas">
          {isSaving ? (
            <span className="flex items-center"><Save className="mr-2 h-4 w-4 animate-spin" /> A guardar...</span>
          ) : (
            <span className="flex items-center"><Save className="mr-2 h-4 w-4" /> Guardar</span>
          )}
        </Button>
      </div>
    </div>
  );
}