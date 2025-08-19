import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Car, 
  MapPin, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Calendar,
  Euro,
  TrendingUp,
  FileText,
  Search
} from 'lucide-react';
import { PayrollMileagePolicy, PayrollMileageTrip } from '../types';
import { payrollService } from '../services/payrollService';
import { PayrollMileagePolicyForm } from './PayrollMileagePolicyForm';
import { MileageTripForm } from './MileageTripForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '../lib/calc';

export function PayrollMileagePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [policies, setPolicies] = useState<PayrollMileagePolicy[]>([]);
  const [trips, setTrips] = useState<PayrollMileageTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PayrollMileagePolicy | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<PayrollMileageTrip | null>(null);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showTripForm, setShowTripForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [policiesData, tripsData] = await Promise.all([
        payrollService.getMileagePolicies(user.id),
        payrollService.getMileageTrips(user.id)
      ]);
      setPolicies(policiesData);
      setTrips(tripsData);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de quilometragem.',
        variant: 'destructive'
      });
      console.error('Error loading mileage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePolicySave = (policy: PayrollMileagePolicy) => {
    if (selectedPolicy) {
      setPolicies(prev => prev.map(p => p.id === policy.id ? policy : p));
    } else {
      setPolicies(prev => [...prev, policy]);
    }
    setShowPolicyForm(false);
    setSelectedPolicy(null);
  };

  const handleTripSave = (trip: PayrollMileageTrip) => {
    if (selectedTrip) {
      setTrips(prev => prev.map(t => t.id === trip.id ? trip : t));
    } else {
      setTrips(prev => [...prev, trip]);
    }
    setShowTripForm(false);
    setSelectedTrip(null);
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta política?')) return;
    
    try {
      await payrollService.deleteMileagePolicy(policyId);
      setPolicies(prev => prev.filter(p => p.id !== policyId));
      toast({
        title: 'Política Excluída',
        description: 'A política foi excluída com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir política.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta viagem?')) return;
    
    try {
      await payrollService.deleteMileageTrip(tripId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
      toast({
        title: 'Viagem Excluída',
        description: 'A viagem foi excluída com sucesso.'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir viagem.',
        variant: 'destructive'
      });
    }
  };

  const exportTripsCSV = () => {
    const filteredTrips = getFilteredTrips();
    const csvContent = [
      ['Data', 'Origem', 'Destino', 'Distância (km)', 'Propósito', 'Política', 'Valor (€)', 'Notas'].join(','),
      ...filteredTrips.map(trip => {
        const policy = policies.find(p => p.id === trip.policy_id);
        const amount = policy ? (policy.rate_per_km_cents * trip.distance_km) / 100 : 0;
        return [
          trip.trip_date,
          `"${trip.origin}"`,
          `"${trip.destination}"`,
          trip.distance_km,
          `"${trip.purpose}"`,
          `"${policy?.name || 'N/A'}"`,
          amount.toFixed(2),
          `"${trip.notes || ''}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viagens-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredTrips = () => {
    return trips.filter(trip => {
      const matchesSearch = searchTerm === '' || 
        trip.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.purpose.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMonth = trip.trip_date.startsWith(selectedMonth);
      
      return matchesSearch && matchesMonth;
    });
  };

  const getMonthlyStats = () => {
    const monthlyTrips = getFilteredTrips();
    const totalKm = monthlyTrips.reduce((sum, trip) => sum + trip.distance_km, 0);
    const totalAmount = monthlyTrips.reduce((sum, trip) => {
      const policy = policies.find(p => p.id === trip.policy_id);
      return sum + (policy ? policy.rate_per_km_cents * trip.distance_km : 0);
    }, 0);
    
    return {
      totalTrips: monthlyTrips.length,
      totalKm,
      totalAmount
    };
  };

  const stats = getMonthlyStats();
  const filteredTrips = getFilteredTrips();
  const activePolicies = policies.filter(p => p.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados de quilometragem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Quilometragem</h1>
          <p className="text-muted-foreground">
            Gerir políticas de quilometragem e registar viagens para reembolso.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Viagens este Mês</p>
                <p className="text-2xl font-bold">{stats.totalTrips}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total KM</p>
                <p className="text-2xl font-bold">{stats.totalKm.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Euro className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Valor a Reembolsar</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Car className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Políticas Ativas</p>
                <p className="text-2xl font-bold">{activePolicies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="trips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trips">Viagens</TabsTrigger>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
        </TabsList>

        {/* Trips Tab */}
        <TabsContent value="trips" className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar viagens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportTripsCSV} disabled={filteredTrips.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              
              <Dialog open={showTripForm} onOpenChange={setShowTripForm}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setSelectedTrip(null); setShowTripForm(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Viagem
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedTrip ? 'Editar Viagem' : 'Nova Viagem'}
                    </DialogTitle>
                  </DialogHeader>
                  <MileageTripForm
                    trip={selectedTrip || undefined}
                    policies={activePolicies}
                    onSave={handleTripSave}
                    onCancel={() => setShowTripForm(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Trips List */}
          {filteredTrips.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma viagem encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedMonth !== `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` 
                    ? 'Tente ajustar os filtros de pesquisa.' 
                    : 'Comece por registar a sua primeira viagem.'}
                </p>
                {activePolicies.length > 0 && (
                  <Button onClick={() => { setSelectedTrip(null); setShowTripForm(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Registar Primeira Viagem
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTrips.map((trip) => {
                const policy = policies.find(p => p.id === trip.policy_id);
                const amount = policy ? policy.rate_per_km_cents * trip.distance_km : 0;
                
                return (
                  <Card key={trip.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">
                              {trip.origin} → {trip.destination}
                            </h3>
                            <Badge variant="outline">
                              {new Date(trip.trip_date).toLocaleDateString('pt-PT')}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Propósito:</span> {trip.purpose}
                            </div>
                            <div>
                              <span className="font-medium">Distância:</span> {trip.distance_km} km
                            </div>
                            <div>
                              <span className="font-medium">Política:</span> {policy?.name || 'N/A'}
                            </div>
                          </div>
                          
                          {trip.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              <span className="font-medium">Notas:</span> {trip.notes}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-green-600">
                              {formatCurrency(amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {policy ? formatCurrency(policy.rate_per_km_cents) : '€0.00'}/km
                            </p>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTrip(trip);
                                setShowTripForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTrip(trip.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Políticas de Quilometragem</h2>
              <p className="text-muted-foreground">
                Configure as taxas de reembolso por quilómetro.
              </p>
            </div>
            
            <Dialog open={showPolicyForm} onOpenChange={setShowPolicyForm}>
              <DialogTrigger asChild>
                <Button onClick={() => { setSelectedPolicy(null); setShowPolicyForm(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Política
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedPolicy ? 'Editar Política' : 'Nova Política'}
                  </DialogTitle>
                </DialogHeader>
                <PayrollMileagePolicyForm
                  policy={selectedPolicy || undefined}
                  onSave={handlePolicySave}
                  onCancel={() => setShowPolicyForm(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {policies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma política configurada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie uma política de quilometragem para começar a registar viagens.
                </p>
                <Button onClick={() => { setSelectedPolicy(null); setShowPolicyForm(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Política
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((policy) => (
                <Card key={policy.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {policy.name}
                          {!policy.is_active && (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {formatCurrency(policy.rate_per_km_cents)} por quilómetro
                        </CardDescription>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPolicy(policy);
                            setShowPolicyForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePolicy(policy.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {policy.max_km_per_month && (
                        <div className="flex justify-between">
                          <span>Limite mensal:</span>
                          <span>{policy.max_km_per_month} km</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Requer comprovativo:</span>
                        <span>{policy.requires_receipt ? 'Sim' : 'Não'}</span>
                      </div>
                      {policy.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground">{policy.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* No Policies Warning */}
      {activePolicies.length === 0 && (
        <Alert>
          <Car className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Não há políticas de quilometragem ativas. Crie uma política antes de registar viagens.
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setSelectedPolicy(null); setShowPolicyForm(true); }}
              >
                Criar Política
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}