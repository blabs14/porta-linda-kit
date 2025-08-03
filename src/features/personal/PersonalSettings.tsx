import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Settings, User, Shield, Bell, Palette, Eye, EyeOff, Moon, Sun, Smartphone, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

const PersonalSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Função para alterar palavra-passe
  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    try {
      // Aqui implementaria a lógica de alteração de palavra-passe
      toast({
        title: "Palavra-passe alterada",
        description: "A sua palavra-passe foi alterada com sucesso.",
      });
      setIsSecurityOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a palavra-passe.",
        variant: "destructive",
      });
    }
  };

  // Função para alterar tema
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    // Aqui implementaria a lógica de alteração de tema
    toast({
      title: "Tema alterado",
      description: `Tema alterado para ${newTheme === 'system' ? 'sistema' : newTheme === 'dark' ? 'escuro' : 'claro'}.`,
    });
  };

  // Função para salvar configurações de notificações
  const handleNotificationSettings = (settings: any) => {
    // Aqui implementaria a lógica de salvamento das configurações
    toast({
      title: "Configurações salvas",
      description: "As suas configurações de notificações foram salvas.",
    });
    setIsNotificationsOpen(false);
  };

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
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Editar Perfil</DialogTitle>
                  <DialogDescription>
                    Atualize suas informações pessoais
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">ID do Utilizador</label>
                    <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => {
                      toast({
                        title: "Perfil atualizado",
                        description: "As suas informações foram atualizadas.",
                      });
                      setIsProfileOpen(false);
                    }}>
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
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Configurações de Segurança</DialogTitle>
                  <DialogDescription>
                    Gerencie sua palavra-passe e configurações de segurança
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Palavra-passe Atual</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full p-2 border rounded-md"
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
                    <label className="text-sm font-medium">Nova Palavra-passe</label>
                    <input
                      type="password"
                      className="w-full p-2 border rounded-md"
                      placeholder="Nova palavra-passe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confirmar Nova Palavra-passe</label>
                    <input
                      type="password"
                      className="w-full p-2 border rounded-md"
                      placeholder="Confirmar nova palavra-passe"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsSecurityOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => {
                      toast({
                        title: "Segurança atualizada",
                        description: "As suas configurações de segurança foram atualizadas.",
                      });
                      setIsSecurityOpen(false);
                    }}>
                      Salvar
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
              <DialogContent className="sm:max-w-[425px]">
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
                      <span className="text-sm">Notificações por Email</span>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm">Notificações Push</span>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Lembretes de Objetivos</span>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsNotificationsOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => {
                      toast({
                        title: "Notificações configuradas",
                        description: "As suas configurações de notificações foram salvas.",
                      });
                      setIsNotificationsOpen(false);
                    }}>
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
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Configurações de Aparência</DialogTitle>
                  <DialogDescription>
                    Escolha o tema da interface
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-20"
                      onClick={() => handleThemeChange('light')}
                    >
                      <Sun className="h-5 w-5" />
                      <span className="text-xs">Claro</span>
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-20"
                      onClick={() => handleThemeChange('dark')}
                    >
                      <Moon className="h-5 w-5" />
                      <span className="text-xs">Escuro</span>
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-20"
                      onClick={() => handleThemeChange('system')}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-xs">Sistema</span>
                    </Button>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAppearanceOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => {
                      toast({
                        title: "Aparência atualizada",
                        description: "As suas configurações de aparência foram salvas.",
                      });
                      setIsAppearanceOpen(false);
                    }}>
                      Salvar
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