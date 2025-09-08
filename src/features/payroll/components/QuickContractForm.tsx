import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { createContract } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/shared/lib/logger';

interface QuickContractFormProps {
  onContractCreated: (contract: any) => void;
  onCancel: () => void;
}

export function QuickContractForm({ onContractCreated, onCancel }: QuickContractFormProps) {
  const [contractName, setContractName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractName.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira um nome para o contrato.',
        variant: 'destructive'
      });
      return;
    }

    // Verificar se o nome parece ser um nome de pessoa
    const trimmedName = contractName.trim();
    const commonPersonNames = /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+/;
    if (commonPersonNames.test(trimmedName)) {
      toast({
        title: 'Nome inválido',
        description: 'O nome do contrato não deve ser o nome de uma pessoa. Use algo como "Contrato Principal" ou "Tempo Integral".',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (!user?.id) {
        throw new Error('Utilizador não autenticado');
      }

      // Criar contrato com dados mínimos
      const contractData = {
        name: contractName.trim(),
        base_salary_cents: 100000, // €1000 como valor mínimo positivo
        weekly_hours: 40,
        currency: 'EUR',
        schedule_json: {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        },
        vacation_bonus_mode: 'monthly' as const
      };

      const newContract = await createContract(user.id, contractData);
      
      toast({
        title: 'Contrato criado',
        description: `O contrato "${contractName}" foi criado com sucesso.`
      });
      
      onContractCreated(newContract);
    } catch (error) {
      logger.error('Erro ao criar contrato:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao criar o contrato. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Criar Primeiro Contrato</CardTitle>
        <CardDescription>
          Insira um nome para o seu primeiro contrato (ex: "Contrato Principal", "Tempo Integral"). Não use o nome do funcionário.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contractName">Nome do Contrato</Label>
            <Input
              id="contractName"
              type="text"
              placeholder="Ex: Contrato Principal, Tempo Integral, Meio Período"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !contractName.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Contrato'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}