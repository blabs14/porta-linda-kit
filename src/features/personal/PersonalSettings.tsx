import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Settings, User, Shield, Bell, Palette } from 'lucide-react';

const PersonalSettings: React.FC = () => {
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
            <Button variant="outline">Editar</Button>
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
            <Button variant="outline">Configurar</Button>
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
            <Button variant="outline">Configurar</Button>
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
            <Button variant="outline">Configurar</Button>
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