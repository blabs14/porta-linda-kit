import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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

const familyMembers = [
  {
    id: 1,
    name: 'Maria Silva',
    email: 'maria.silva@email.com',
    role: 'Administradora',
    avatar: '',
    joinDate: '2023-01-15',
    totalSpent: 1250.80,
    totalSaved: 3200.00,
    activeGoals: 3,
    lastActive: '2 horas',
    status: 'active',
    permissions: ['manage_family', 'view_all', 'edit_goals']
  },
  {
    id: 2,
    name: 'João Silva',
    email: 'joao.silva@email.com',
    role: 'Membro',
    avatar: '',
    joinDate: '2023-01-15',
    totalSpent: 890.45,
    totalSaved: 1800.00,
    activeGoals: 2,
    lastActive: '1 dia',
    status: 'active',
    permissions: ['view_own', 'edit_own']
  },
  {
    id: 3,
    name: 'Ana Silva',
    email: 'ana.silva@email.com',
    role: 'Membro Júnior',
    avatar: '',
    joinDate: '2023-06-20',
    totalSpent: 125.30,
    totalSaved: 450.00,
    activeGoals: 1,
    lastActive: '3 dias',
    status: 'active',
    permissions: ['view_own']
  },
  {
    id: 4,
    name: 'Pedro Silva',
    email: 'pedro.silva@email.com',
    role: 'Convidado',
    avatar: '',
    joinDate: '2024-01-10',
    totalSpent: 0,
    totalSaved: 0,
    activeGoals: 0,
    lastActive: 'Nunca',
    status: 'pending',
    permissions: []
  }
];

const sharedGoals = [
  {
    id: 1,
    title: 'Férias Familiares',
    target: 5000,
    current: 2800,
    contributors: ['Maria Silva', 'João Silva', 'Ana Silva'],
    deadline: '2024-07-01'
  },
  {
    id: 2,
    title: 'Fundo Emergência Familiar',
    target: 15000,
    current: 8500,
    contributors: ['Maria Silva', 'João Silva'],
    deadline: '2024-12-31'
  }
];

const roleIcons = {
  'Administradora': Crown,
  'Membro': Shield,
  'Membro Júnior': Users,
  'Convidado': Eye
};

const roleColors = {
  'Administradora': 'text-primary bg-primary/10',
  'Membro': 'text-secondary bg-secondary/10',
  'Membro Júnior': 'text-warning bg-warning/10',
  'Convidado': 'text-muted-foreground bg-muted'
};

export default function Family() {
  const totalFamilySpent = familyMembers.reduce((sum, member) => sum + member.totalSpent, 0);
  const totalFamilySaved = familyMembers.reduce((sum, member) => sum + member.totalSaved, 0);
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

      {/* Membros da família - carrossel em mobile, lista em desktop */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Membros da Família
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: carrossel horizontal */}
          <div className="md:hidden">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {familyMembers.map((member) => {
                const RoleIcon = roleIcons[member.role as keyof typeof roleIcons];
                return (
                  <div
                    key={member.id}
                    className="flex-shrink-0 w-64 p-4 bg-accent rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{member.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${roleColors[member.role as keyof typeof roleColors]}`}>
                        <RoleIcon className="h-3 w-3" />
                        {member.role}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Gasto</p>
                          <p className="font-semibold">€{member.totalSpent.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Poupado</p>
                          <p className="font-semibold">€{member.totalSaved.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop: lista completa */}
          <div className="hidden md:block space-y-3">
            {familyMembers.map((member) => {
              const RoleIcon = roleIcons[member.role as keyof typeof roleIcons];
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{member.name}</h3>
                        {member.status === 'pending' && (
                          <Badge variant="secondary" className="text-xs">Pendente</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className={`flex items-center gap-1 text-xs mt-1 px-2 py-1 rounded w-fit ${roleColors[member.role as keyof typeof roleColors]}`}>
                        <RoleIcon className="h-3 w-3" />
                        {member.role}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Gasto</p>
                          <p className="font-semibold">€{member.totalSpent.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Poupado</p>
                          <p className="font-semibold">€{member.totalSaved.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Objetivos</p>
                          <p className="font-semibold">{member.activeGoals}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ativo há {member.lastActive}
                      </p>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Objetivos partilhados */}
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Objetivos Partilhados
          </CardTitle>
          <Button variant="outline" size="sm" className="border-border">
            <Plus className="h-4 w-4 mr-2" />
            Novo Objetivo
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {sharedGoals.map((goal) => {
            const progress = (goal.current / goal.target) * 100;
            return (
              <div
                key={goal.id}
                className="flex items-center justify-between p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">{goal.title}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>€{goal.current.toLocaleString()}</span>
                        <span>€{goal.target.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {goal.contributors.slice(0, 3).map((contributor, index) => (
                          <Avatar key={index} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                              {contributor.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {goal.contributors.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">+{goal.contributors.length - 3}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {goal.contributors.length} contribuintes
                      </span>
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}