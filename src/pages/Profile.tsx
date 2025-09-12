import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile, useUpdateProfile } from '../hooks/useProfilesQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LoadingSpinner } from '../components/ui/loading-states';
import { useToast } from '../hooks/use-toast';
import { ArrowLeft, User, Mail, Save, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const [formData, setFormData] = useState({
    nome: profile?.nome || '',
    foto_url: profile?.foto_url || '',
    percentual_divisao: profile?.percentual_divisao || 50,
    poupanca_mensal: profile?.poupanca_mensal || 0,
  });

  const [isEditing, setIsEditing] = useState(false);

  // Atualizar formData quando o perfil carrega
  React.useEffect(() => {
    if (profile) {
      setFormData({
        nome: profile.nome || '',
        foto_url: profile.foto_url || '',
        percentual_divisao: profile.percentual_divisao || 50,
        poupanca_mensal: profile.poupanca_mensal || 0,
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'percentual_divisao' || name === 'poupanca_mensal' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSave = async () => {
    if (!profile?.id) {
      toast({
        title: 'Erro',
        description: 'Perfil não encontrado',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        id: profile.id,
        data: {
          ...formData,
          updated_at: new Date().toISOString(),
        }
      });

      setIsEditing(false);
      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        nome: profile.nome || '',
        foto_url: profile.foto_url || '',
        percentual_divisao: profile.percentual_divisao || 50,
        poupanca_mensal: profile.poupanca_mensal || 0,
      });
    }
    setIsEditing(false);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Erro ao carregar perfil</h1>
          <p className="text-gray-600 mt-2">Não foi possível carregar os dados do perfil</p>
          <Button onClick={() => navigate('/app')} className="mt-4" aria-label="Voltar à aplicação principal">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Perfil do Utilizador</h1>
          <p className="text-muted-foreground">Gerir informações pessoais e preferências</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Dados básicos do seu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado aqui
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foto_url">URL da Foto</Label>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="foto_url"
                  name="foto_url"
                  value={formData.foto_url}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferências Financeiras */}
        <Card>
          <CardHeader>
            <CardTitle>Preferências Financeiras</CardTitle>
            <CardDescription>
              Configurações para gestão familiar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="percentual_divisao">
                Percentual de Divisão (%)
              </Label>
              <Input
                id="percentual_divisao"
                name="percentual_divisao"
                type="number"
                min="0"
                max="100"
                value={formData.percentual_divisao}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Percentual para divisão de despesas familiares
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="poupanca_mensal">
                Poupança Mensal (€)
              </Label>
              <Input
                id="poupanca_mensal"
                name="poupanca_mensal"
                type="number"
                min="0"
                step="0.01"
                value={formData.poupanca_mensal}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Valor mensal para poupança automática
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-4 mt-6">
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} aria-label="Editar perfil de utilizador">
            <User className="h-4 w-4 mr-2" />
            Editar Perfil
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleCancel} aria-label="Cancelar edição do perfil">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateProfileMutation.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}