import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, FileText, Clock, Car } from 'lucide-react';

// Wizard de onboarding simples para orientar o utilizador a criar um contrato
// e concluir as configurações mínimas para usar a Folha de Pagamento.
export function PayrollOnboardingWizard() {
  const navigate = useNavigate();

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo à Folha de Pagamento</CardTitle>
          <CardDescription>
            Vamos configurar o básico para começares a registar horas e quilometragem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              Para começar, cria pelo menos um contrato de trabalho ativo. Podes ajustar políticas e feriados mais tarde.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">1. Criar contrato</p>
                <p className="text-sm text-muted-foreground">Define cargo, horário e salário base.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">2. (Opcional) Políticas de horas extra</p>
                <p className="text-sm text-muted-foreground">Configura regras para cálculo automático de horas extra.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Car className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">3. (Opcional) Política de quilometragem</p>
                <p className="text-sm text-muted-foreground">Define valores por km e regras de reembolso.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => navigate('/personal/payroll/config')}>Ir para gestão de contratos</Button>
            <Button variant="ghost" onClick={() => navigate('/personal/payroll')}>Ir para resumo</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4" />
        <span>Podes voltar a este assistente a qualquer momento em Configuração → Onboarding.</span>
      </div>
    </div>
  );
}