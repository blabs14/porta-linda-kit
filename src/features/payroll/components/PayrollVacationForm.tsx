import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { PayrollVacation, PayrollVacationFormData } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, differenceInDays, addDays, isWeekend } from 'date-fns';

interface PayrollVacationFormProps {
  vacation?: PayrollVacation;
  year: number;
  onSave: (vacation: PayrollVacation) => void;
  onCancel: () => void;
}

export function PayrollVacationForm({ vacation, year, onSave, onCancel }: PayrollVacationFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PayrollVacationFormData>({
    start_date: vacation?.start_date || '',
    end_date: vacation?.end_date || '',
    description: vacation?.description || ''
  });
  const [isApproved, setIsApproved] = useState(vacation?.is_approved || false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    let workingDays = 0;
    let currentDate = start;
    
    while (currentDate <= end) {
      if (!isWeekend(currentDate)) {
        workingDays++;
      }
      currentDate = addDays(currentDate, 1);
    }
    
    return workingDays;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.start_date) {
      newErrors.start_date = 'Data de início é obrigatória';
    }
    
    if (!formData.end_date) {
      newErrors.end_date = 'Data de fim é obrigatória';
    }
    
    if (formData.start_date && formData.end_date) {
      const startDate = parseISO(formData.start_date);
      const endDate = parseISO(formData.end_date);
      
      if (startDate > endDate) {
        newErrors.end_date = 'Data de fim deve ser posterior à data de início';
      }
      
      if (startDate.getFullYear() !== year || endDate.getFullYear() !== year) {
        newErrors.start_date = `As datas devem estar no ano ${year}`;
      }
      
      const workingDays = calculateWorkingDays(formData.start_date, formData.end_date);
      if (workingDays === 0) {
        newErrors.start_date = 'O período deve incluir pelo menos um dia útil';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.id) return;
    
    setLoading(true);
    try {
      const workingDays = calculateWorkingDays(formData.start_date, formData.end_date);
      
      const vacationData = {
        ...formData,
        days_count: workingDays,
        year,
        is_approved: isApproved
      };
      
      let savedVacation: PayrollVacation;
      
      if (vacation) {
        savedVacation = await payrollService.updateVacation(vacation.id, vacationData);
      } else {
        savedVacation = await payrollService.createVacation(user.id, vacationData);
      }
      
      onSave(savedVacation);
    } catch (error) {
      toast({
        title: 'Erro',
        description: vacation ? 'Erro ao atualizar férias.' : 'Erro ao criar férias.',
        variant: 'destructive'
      });
      console.error('Error saving vacation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PayrollVacationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const workingDays = calculateWorkingDays(formData.start_date, formData.end_date);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Data de Início</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            className={errors.start_date ? 'border-red-500' : ''}
          />
          {errors.start_date && (
            <p className="text-sm text-red-500">{errors.start_date}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="end_date">Data de Fim</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => handleInputChange('end_date', e.target.value)}
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            className={errors.end_date ? 'border-red-500' : ''}
          />
          {errors.end_date && (
            <p className="text-sm text-red-500">{errors.end_date}</p>
          )}
        </div>
      </div>
      
      {workingDays > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Este período inclui <strong>{workingDays} {workingDays === 1 ? 'dia útil' : 'dias úteis'}</strong>.
            Fins de semana não são contabilizados como dias de férias.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Ex: Férias de verão, viagem familiar..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_approved"
          checked={isApproved}
          onCheckedChange={(checked) => setIsApproved(checked as boolean)}
        />
        <Label htmlFor="is_approved" className="text-sm font-normal">
          Marcar como aprovado
        </Label>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || workingDays === 0}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {vacation ? 'Atualizar' : 'Criar'} Férias
        </Button>
      </div>
    </form>
  );
}