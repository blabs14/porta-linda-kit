import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, MapPin, Calculator, Euro } from 'lucide-react';
import { PayrollMileageTrip, PayrollMileagePolicy } from '../types';
import { payrollService } from '../services/payrollService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, centsToEuros } from '../lib/calc';

interface MileageTripFormProps {
  trip?: PayrollMileageTrip;
  policies: PayrollMileagePolicy[];
  onSave: (trip: PayrollMileageTrip) => void;
  onCancel: () => void;
}

export function MileageTripForm({ trip, policies, onSave, onCancel }: MileageTripFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    policy_id: '',
    trip_date: '',
    origin: '',
    destination: '',
    distance_km: 0,
    purpose: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPolicy, setSelectedPolicy] = useState<PayrollMileagePolicy | null>(null);
  const [calculatedAmount, setCalculatedAmount] = useState(0);

  useEffect(() => {
    if (trip) {
      setFormData({
        policy_id: trip.policy_id,
        trip_date: trip.trip_date,
        origin: trip.origin,
        destination: trip.destination,
        distance_km: trip.distance_km,
        purpose: trip.purpose,
        notes: trip.notes || ''
      });
    } else {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, trip_date: today }));
    }
  }, [trip]);

  useEffect(() => {
    if (formData.policy_id) {
      const policy = policies.find(p => p.id === formData.policy_id);
      setSelectedPolicy(policy || null);
      
      if (policy && formData.distance_km > 0) {
        setCalculatedAmount(policy.rate_per_km_cents * formData.distance_km);
      } else {
        setCalculatedAmount(0);
      }
    } else {
      setSelectedPolicy(null);
      setCalculatedAmount(0);
    }
  }, [formData.policy_id, formData.distance_km, policies]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.policy_id) {
      newErrors.policy_id = 'Política é obrigatória';
    }

    if (!formData.trip_date) {
      newErrors.trip_date = 'Data da viagem é obrigatória';
    }

    if (!formData.origin.trim()) {
      newErrors.origin = 'Origem é obrigatória';
    }

    if (!formData.destination.trim()) {
      newErrors.destination = 'Destino é obrigatório';
    }

    if (formData.distance_km <= 0) {
      newErrors.distance_km = 'Distância deve ser maior que zero';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Propósito da viagem é obrigatório';
    }

    // Check policy limits
    if (selectedPolicy?.max_km_per_month && formData.distance_km > selectedPolicy.max_km_per_month) {
      newErrors.distance_km = `Distância excede o limite da política (${selectedPolicy.max_km_per_month} km)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.id) {
      return;
    }

    setLoading(true);
    try {
      const tripData = {
        ...formData,
        notes: formData.notes || null
      };

      let savedTrip: PayrollMileageTrip;
      
      if (trip) {
        savedTrip = await payrollService.updateMileageTrip(trip.id, tripData);
        toast({
          title: 'Viagem Atualizada',
          description: 'A viagem foi atualizada com sucesso.'
        });
      } else {
        savedTrip = await payrollService.createMileageTrip(user.id, formData.policy_id, tripData);
        toast({
          title: 'Viagem Registada',
          description: 'A viagem foi registada com sucesso.'
        });
      }

      onSave(savedTrip);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar viagem.',
        variant: 'destructive'
      });
      console.error('Error saving mileage trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const activePolicies = policies.filter(p => p.is_active);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Detalhes da Viagem
          </CardTitle>
          <CardDescription>
            Registe os detalhes da viagem para reembolso de quilometragem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="policy_id">Política de Quilometragem *</Label>
              <Select
                value={formData.policy_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, policy_id: value }))}
              >
                <SelectTrigger className={errors.policy_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione uma política" />
                </SelectTrigger>
                <SelectContent>
                  {activePolicies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.name} ({formatCurrency(policy.rate_per_km_cents)}/km)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.policy_id && (
                <p className="text-sm text-red-500 mt-1">{errors.policy_id}</p>
              )}
            </div>

            <div>
              <Label htmlFor="trip_date">Data da Viagem *</Label>
              <Input
                id="trip_date"
                type="date"
                value={formData.trip_date}
                onChange={(e) => setFormData(prev => ({ ...prev, trip_date: e.target.value }))}
                className={errors.trip_date ? 'border-red-500' : ''}
              />
              {errors.trip_date && (
                <p className="text-sm text-red-500 mt-1">{errors.trip_date}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origin">Origem *</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                placeholder="Ex: Escritório Lisboa"
                className={errors.origin ? 'border-red-500' : ''}
              />
              {errors.origin && (
                <p className="text-sm text-red-500 mt-1">{errors.origin}</p>
              )}
            </div>

            <div>
              <Label htmlFor="destination">Destino *</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="Ex: Cliente Porto"
                className={errors.destination ? 'border-red-500' : ''}
              />
              {errors.destination && (
                <p className="text-sm text-red-500 mt-1">{errors.destination}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="distance_km">Distância (km) *</Label>
              <Input
                id="distance_km"
                type="number"
                step="0.1"
                min="0"
                value={formData.distance_km || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  distance_km: parseFloat(e.target.value) || 0
                }))}
                placeholder="Ex: 125.5"
                className={errors.distance_km ? 'border-red-500' : ''}
              />
              {errors.distance_km && (
                <p className="text-sm text-red-500 mt-1">{errors.distance_km}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Distância total da viagem (ida e volta se aplicável)
              </p>
            </div>

            <div>
              <Label htmlFor="purpose">Propósito da Viagem *</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Ex: Reunião com cliente"
                className={errors.purpose ? 'border-red-500' : ''}
              />
              {errors.purpose && (
                <p className="text-sm text-red-500 mt-1">{errors.purpose}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas Adicionais</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionais sobre a viagem..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cálculo do Reembolso */}
      {selectedPolicy && formData.distance_km > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cálculo do Reembolso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span>Política:</span>
                <span className="font-medium">{selectedPolicy.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Taxa por km:</span>
                <span className="font-medium">{formatCurrency(selectedPolicy.rate_per_km_cents)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Distância:</span>
                <span className="font-medium">{formData.distance_km} km</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total a Reembolsar:</span>
                  <span className="text-green-600">
                    {formatCurrency(calculatedAmount)}
                  </span>
                </div>
              </div>
              
              {selectedPolicy.max_km_per_month && (
                <div className="text-sm text-muted-foreground pt-2 border-t">
                  <p>Limite mensal da política: {selectedPolicy.max_km_per_month} km</p>
                  {formData.distance_km > selectedPolicy.max_km_per_month && (
                    <p className="text-red-500">⚠️ Distância excede o limite da política</p>
                  )}
                </div>
              )}
              
              {selectedPolicy.requires_receipt && (
                <Alert>
                  <Euro className="h-4 w-4" />
                  <AlertDescription>
                    Esta política requer comprovativo. Certifique-se de guardar os recibos de combustível.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {loading ? 'Salvando...' : (trip ? 'Atualizar' : 'Registar')} Viagem
        </Button>
      </div>
    </form>
  );
}