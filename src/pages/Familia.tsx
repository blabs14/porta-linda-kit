import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/ui/loading-states';
import { useFamilyMembers } from '../hooks/useFamilyMembersQuery';
import {
  Users,
  Plus,
  Settings,
  CreditCard,
  PiggyBank,
  TrendingUp,
  MoreVertical,
  Crown,
  Shield,
  Eye,
  ChevronRight,
  Target
} from 'lucide-react';

const roleIcons = {
  'owner': Crown,
  'admin': Shield,
  'member': Users,
  'viewer': Eye
};

const roleColors = {
  'owner': 'text-primary bg-primary/10',
  'admin': 'text-secondary bg-secondary/10',
  'member': 'text-warning bg-warning/10',
  'viewer': 'text-muted-foreground bg-muted'
};

export default function Familia() {
  const { data: familyMembers = [], isLoading: loading } = useFamilyMembers();

  const totalFamilySpent = familyMembers.reduce((sum, member) => sum + (member.totalSpent || 0), 0);
  const totalFamilySaved = familyMembers.reduce((sum, member) => sum + (member.totalSaved || 0), 0);
  const activeMembers = familyMembers.filter(member => member.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Família</h1>
          <p className="text-muted-foreground">Gerir membros e contas partilhadas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          <Button className="bg-primary hover:bg-primary-dark shadow-primary">
            <Plus className="h-4 w-4 mr-2" />
            Convidar Membro
          </Button>
        </div>
      </div>

      {/* Resumo da família */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Membros Ativos</p>
                <p className="text-2xl font-bold text-foreground">{activeMembers}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Gasto</p>
                <p className="text-2xl font-bold text-foreground">€{totalFamilySpent.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Poupado</p>
                <p className="text-2xl font-bold text-foreground">€{totalFamilySaved.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <PiggyBank className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membros da família */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Membros da Família
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center">A carregar...</div>
          ) : familyMembers.length === 0 ? (
            <div className="text-center text-muted-foreground">Nenhum membro encontrado.</div>
          ) : (
            <div className="hidden md:block space-y-3">
              {familyMembers.map((member) => {
                const RoleIcon = roleIcons[member.role as keyof typeof roleIcons] || Users;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {member.name ? member.name.split(' ').map((n: string) => n[0]).join('') : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{member.name || member.id}</h3>
                          {member.status === 'pending' && (
                            <Badge variant="secondary" className="text-xs">Pendente</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email || member.user_id}</p>
                        <div className={`flex items-center gap-1 text-xs mt-1 px-2 py-1 rounded w-fit ${roleColors[member.role as keyof typeof roleColors] || ''}`}>
                          <RoleIcon className="h-3 w-3" />
                          {member.role}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}