import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useFamily } from './FamilyProvider';
import { Settings, Users, Shield, Trash2 } from 'lucide-react';

const FamilySettings: React.FC = () => {
  const { family, myRole, isLoading } = useFamily();

  if (isLoading.family) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma família encontrada</h3>
            <p className="text-muted-foreground">
              Você precisa pertencer a uma família para aceder às configurações.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEditSettings = myRole === 'owner' || myRole === 'admin';

  return (
    <div className="p-6 space-y-6">
      {/* Informações da Família */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informações da Família
          </CardTitle>
          <CardDescription>
            Detalhes básicos da família
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome da Família</label>
            <input
              type="text"
              value={family.nome}
              disabled={!canEditSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <textarea
              value={family.description || ''}
              disabled={!canEditSettings}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              placeholder="Descrição da família..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Criada em</label>
            <p className="text-sm text-muted-foreground">
              {new Date(family.created_at).toLocaleDateString('pt-PT')}
            </p>
          </div>
          
          {canEditSettings && (
            <div className="pt-4 border-t">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                Guardar Alterações
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Segurança e Permissões
          </CardTitle>
          <CardDescription>
            Configurações de acesso e privacidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="font-medium">Seu Role</p>
              <p className="text-sm text-muted-foreground">
                {myRole === 'owner' ? 'Proprietário - Controlo total' :
                 myRole === 'admin' ? 'Administrador - Pode gerir membros' :
                 myRole === 'member' ? 'Membro - Pode ver e adicionar dados' :
                 'Visualizador - Apenas pode ver'}
              </p>
            </div>
            <span className={`text-sm px-2 py-1 rounded border ${
              myRole === 'owner' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
              myRole === 'admin' ? 'bg-blue-100 text-blue-800 border-blue-200' :
              'bg-green-100 text-green-800 border-green-200'
            }`}>
              {myRole === 'owner' ? 'Proprietário' :
               myRole === 'admin' ? 'Administrador' :
               myRole === 'member' ? 'Membro' : 'Visualizador'}
            </span>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Permissões Atuais</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {myRole === 'owner' && (
                <>
                  <li>• Pode alterar configurações da família</li>
                  <li>• Pode convidar e remover membros</li>
                  <li>• Pode alterar roles de outros membros</li>
                  <li>• Pode eliminar a família</li>
                </>
              )}
              {myRole === 'admin' && (
                <>
                  <li>• Pode convidar novos membros</li>
                  <li>• Pode alterar roles de membros</li>
                  <li>• Pode gerir dados da família</li>
                </>
              )}
              {myRole === 'member' && (
                <>
                  <li>• Pode adicionar transações</li>
                  <li>• Pode criar e editar objetivos</li>
                  <li>• Pode gerir orçamentos</li>
                </>
              )}
              {myRole === 'viewer' && (
                <>
                  <li>• Pode visualizar dados da família</li>
                  <li>• Não pode fazer alterações</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Avançadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Avançadas
          </CardTitle>
          <CardDescription>
            Opções avançadas para a família
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificações</p>
                <p className="text-sm text-muted-foreground">
                  Receber notificações sobre atividades da família
                </p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Relatórios Automáticos</p>
                <p className="text-sm text-muted-foreground">
                  Enviar relatórios mensais por email
                </p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Backup Automático</p>
                <p className="text-sm text-muted-foreground">
                  Fazer backup automático dos dados
                </p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
          </div>
          
          {canEditSettings && (
            <div className="pt-4 border-t">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                Guardar Configurações
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zona de Perigo */}
      {myRole === 'owner' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription className="text-red-600">
              Ações irreversíveis - use com cuidado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Eliminar Família</h4>
              <p className="text-sm text-red-700 mb-3">
                Esta ação irá eliminar permanentemente a família e todos os dados associados. 
                Esta ação não pode ser desfeita.
              </p>
              <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                Eliminar Família
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FamilySettings; 