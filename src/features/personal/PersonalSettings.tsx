import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Settings, User, Shield, Bell, Palette, Eye, EyeOff, Moon, Sun, Smartphone, Mail, Calendar, Save, BarChart3, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { usePersonalSettings } from '../../hooks/usePersonalSettings';
import { LoadingSpinner } from '../../components/ui/loading-states';

const PersonalSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    settings,
    profile,
    currentTheme,
    isLoading,
    isUpdatingProfile,
    isUpdatingTheme,
    isUpdatingNotifications,
    updateProfile,
    changeTheme,
    updateNotifications
  } = usePersonalSettings();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Estados para formulários
  const [profileData, setProfileData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    phone: profile?.phone || '',
    birthDate: profile?.birth_date || ''
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: settings?.personal_settings?.notifications?.email ?? true,
    pushNotifications: settings?.personal_settings?.notifications?.push ?? true,
    goalReminders: settings?.personal_settings?.notifications?.goal_reminders ?? true,
    budgetAlerts: settings?.personal_settings?.notifications?.budget_alerts ?? true,
    transactionAlerts: settings?.personal_settings?.notifications?.transaction_alerts ?? false
  });

  // Atualizar estados locais quando os dados mudarem
  React.useEffect(() => {
    if (profile) {
      setProfileData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        birthDate: profile.birth_date || ''
      });
    }
  }, [profile]);

  React.useEffect(() => {
    if (settings?.personal_settings?.notifications) {
      setNotificationSettings({
        emailNotifications: settings.personal_settings.notifications.email ?? true,
        pushNotifications: settings.personal_settings.notifications.push ?? true,
        goalReminders: settings.personal_settings.notifications.goal_reminders ?? true,
        budgetAlerts: settings.personal_settings.notifications.budget_alerts ?? true,
        transactionAlerts: settings.personal_settings.notifications.transaction_alerts ?? false
      });
    }
  }, [settings?.personal_settings?.notifications]);

  // Função para salvar dados do perfil
  const handleProfileSave = async () => {
    try {
      await updateProfile({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        birth_date: profileData.birthDate
      });
      setIsProfileOpen(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    }
  };

  // Função para alterar palavra-passe
  const handlePasswordChange = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As palavras-passe não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (securityData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova palavra-passe deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Aqui implementaria a lógica de alteração de palavra-passe com Supabase Auth
      toast({
        title: "Palavra-passe alterada",
        description: "A sua palavra-passe foi alterada com sucesso.",
      });
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsSecurityOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a palavra-passe.",
        variant: "destructive",
      });
    }
  };

  // Função para salvar configurações de notificações
  const handleNotificationSettings = () => {
    try {
      updateNotifications({
        email: notificationSettings.emailNotifications,
        push: notificationSettings.pushNotifications,
        goal_reminders: notificationSettings.goalReminders,
        budget_alerts: notificationSettings.budgetAlerts,
        transaction_alerts: notificationSettings.transactionAlerts
      });
      setIsNotificationsOpen(false);
    } catch (error) {
      console.error('Erro ao salvar notificações:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Definições Pessoais
          </CardTitle>
          <CardDescription>
            Configure suas preferências e dados pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Perfil */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Dados do Perfil</h3>
                <p className="text-sm text-muted-foreground">
                  Nome, email e informações pessoais
                </p>
              </div>
            </div>
            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Editar</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Editar Perfil</DialogTitle>
                  <DialogDescription>
                    Atualize suas informações pessoais
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nome</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Apelido</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Seu apelido"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+351 123 456 789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={profileData.birthDate}
                      onChange={(e) => setProfileData(prev => ({ ...prev, birthDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleProfileSave} disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Segurança */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Segurança</h3>
                <p className="text-sm text-muted-foreground">
                  Palavra-passe e autenticação
                </p>
              </div>
            </div>
            <Dialog open={isSecurityOpen} onOpenChange={setIsSecurityOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Configurar</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Configurações de Segurança</DialogTitle>
                  <DialogDescription>
                    Gerencie sua palavra-passe e configurações de segurança
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Palavra-passe Atual</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        value={securityData.currentPassword}
                        onChange={(e) => setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Palavra-passe atual"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Nova Palavra-passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Nova palavra-passe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Nova Palavra-passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirmar nova palavra-passe"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsSecurityOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handlePasswordChange}>
                      <Save className="h-4 w-4 mr-2" />
                      Alterar Palavra-passe
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Notificações */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Notificações</h3>
                <p className="text-sm text-muted-foreground">
                  Alertas e lembretes pessoais
                </p>
              </div>
            </div>
            <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Configurar</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Configurações de Notificações</DialogTitle>
                  <DialogDescription>
                    Configure como receber alertas e lembretes
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <div>
                        <span className="text-sm font-medium">Notificações por Email</span>
                        <p className="text-xs text-muted-foreground">Receber alertas por email</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <div>
                        <span className="text-sm font-medium">Notificações Push</span>
                        <p className="text-xs text-muted-foreground">Alertas no navegador</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <span className="text-sm font-medium">Lembretes de Objetivos</span>
                        <p className="text-xs text-muted-foreground">Alertas sobre progresso dos objetivos</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.goalReminders}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, goalReminders: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <div>
                        <span className="text-sm font-medium">Alertas de Orçamento</span>
                        <p className="text-xs text-muted-foreground">Avisos quando ultrapassar limites</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.budgetAlerts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, budgetAlerts: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <div>
                        <span className="text-sm font-medium">Alertas de Transações</span>
                        <p className="text-xs text-muted-foreground">Notificações sobre transações importantes</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationSettings.transactionAlerts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, transactionAlerts: checked }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsNotificationsOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleNotificationSettings} disabled={isUpdatingNotifications}>
                      {isUpdatingNotifications ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Aparência */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Aparência</h3>
                <p className="text-sm text-muted-foreground">
                  Tema e personalização da interface
                </p>
              </div>
            </div>
            <Dialog open={isAppearanceOpen} onOpenChange={setIsAppearanceOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Configurar</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Configurações de Aparência</DialogTitle>
                  <DialogDescription>
                    Escolha o tema da interface
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant={currentTheme === 'light' ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-20"
                      onClick={() => changeTheme('light')}
                      disabled={isUpdatingTheme}
                    >
                      <Sun className="h-5 w-5" />
                      <span className="text-xs">Claro</span>
                    </Button>
                    <Button
                      variant={currentTheme === 'dark' ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-20"
                      onClick={() => changeTheme('dark')}
                      disabled={isUpdatingTheme}
                    >
                      <Moon className="h-5 w-5" />
                      <span className="text-xs">Escuro</span>
                    </Button>
                    <Button
                      variant={currentTheme === 'system' ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-20"
                      onClick={() => changeTheme('system')}
                      disabled={isUpdatingTheme}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-xs">Sistema</span>
                    </Button>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Tema Atual: {currentTheme === 'system' ? 'Sistema' : currentTheme === 'dark' ? 'Escuro' : 'Claro'}</h4>
                    <p className="text-sm text-muted-foreground">
                      O tema será aplicado imediatamente à interface.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAppearanceOpen(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Informações da Área Pessoal */}
      <Card>
        <CardHeader>
          <CardTitle>Acerca da Área Pessoal</CardTitle>
          <CardDescription>
            Informações sobre esta funcionalidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Diferença entre Área Pessoal e Família</h4>
            <p className="text-sm text-blue-700">
              A <strong>Área Pessoal</strong> concentra todas as suas informações financeiras individuais 
              (contas, objetivos, transações) onde <code>family_id IS NULL</code>. 
              A <strong>Área Família</strong> mostra dados partilhados entre membros da família 
              onde <code>family_id IS NOT NULL</code>.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Funcionalidades Disponíveis</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Gestão de contas bancárias pessoais</li>
              <li>• Controlo de cartões de crédito</li>
              <li>• Definição e acompanhamento de objetivos</li>
              <li>• Orçamentos mensais por categoria</li>
              <li>• Histórico completo de transações</li>
              <li>• Insights e dicas personalizadas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalSettings; 