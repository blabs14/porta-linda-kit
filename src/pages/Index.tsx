import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Shield, 
  Users, 
  TrendingUp, 
  PiggyBank, 
  BarChart3, 
  CheckCircle, 
  Star,
  ArrowRight,
  Smartphone,
  Lock,
  Heart,
  Target,
  Zap,
  Globe
} from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Se o utilizador estiver autenticado, redirecionar para a aplicação
      navigate('/app');
    }
  }, [user, loading, navigate]);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  // Landing page para utilizadores não autenticados
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">FamilyFlowFinance</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <a href="/login">Entrar</a>
              </Button>
              <Button asChild>
                <a href="/register">Começar Grátis</a>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <Badge className="mb-6 bg-blue-100 text-blue-800 hover:bg-blue-100">
              ✨ Gestão Financeira Familiar Inteligente
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Controlo Total das
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600"> Finanças Familiares</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Simplifique a gestão financeira da sua família com uma plataforma segura, intuitiva e colaborativa. 
              Orçamentos, poupanças e planeamento financeiro numa só aplicação.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <a href="/register">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                <a href="/login">Já tenho conta</a>
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              ✅ Sem cartão de crédito • ✅ Configuração em 2 minutos • ✅ 100% seguro
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Tudo o que precisa para gerir as finanças familiares
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Funcionalidades pensadas para famílias modernas que querem controlo e transparência financeira.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <PiggyBank className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>Orçamentos Inteligentes</CardTitle>
                  <CardDescription>
                    Crie orçamentos personalizados e receba alertas quando se aproximar dos limites.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Gestão Familiar</CardTitle>
                  <CardDescription>
                    Convide membros da família e gerem as finanças em conjunto com permissões personalizadas.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>Relatórios Detalhados</CardTitle>
                  <CardDescription>
                    Analise tendências de gastos e receba insights personalizados para melhorar as finanças.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <CardTitle>Segurança Máxima</CardTitle>
                  <CardDescription>
                    Encriptação de ponta a ponta e conformidade com RGPD para proteger os seus dados.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-yellow-600" />
                  </div>
                  <CardTitle>Metas de Poupança</CardTitle>
                  <CardDescription>
                    Defina objetivos financeiros e acompanhe o progresso com visualizações motivadoras.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <Smartphone className="w-6 h-6 text-indigo-600" />
                  </div>
                  <CardTitle>Acesso Móvel</CardTitle>
                  <CardDescription>
                    Aplicação web responsiva que funciona perfeitamente em todos os dispositivos.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-green-600">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Porque escolher o FamilyFlowFinance?
            </h2>
            <div className="grid md:grid-cols-2 gap-8 mt-12">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">Simplicidade em Primeiro</h3>
                  <p className="text-blue-100">Interface intuitiva que qualquer membro da família pode usar, independentemente da idade ou experiência tecnológica.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">Feito para Famílias</h3>
                  <p className="text-blue-100">Desenvolvido especificamente para as necessidades das famílias portuguesas, com funcionalidades de colaboração únicas.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">Privacidade Garantida</h3>
                  <p className="text-blue-100">Os seus dados financeiros são seus. Nunca partilhamos informações com terceiros e cumprimos rigorosamente o RGPD.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-white mb-2">Resultados Rápidos</h3>
                  <p className="text-blue-100">Comece a ver melhorias nas suas finanças familiares em apenas uma semana de utilização.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Famílias que já transformaram as suas finanças
              </h2>
              <div className="flex justify-center items-center space-x-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                ))}
                <span className="ml-2 text-lg font-semibold text-gray-700">4.9/5</span>
              </div>
              <p className="text-gray-600">Baseado em mais de 500 avaliações de famílias portuguesas</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">
                    "Finalmente conseguimos controlar os gastos familiares. A aplicação é muito fácil de usar e os relatórios ajudam-nos a tomar melhores decisões."
                  </p>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">MF</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Maria Fernandes</p>
                      <p className="text-sm text-gray-600">Mãe de 2 filhos, Lisboa</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">
                    "Como jovem casal, esta aplicação ajudou-nos a planear o nosso futuro financeiro. As metas de poupança são muito motivadoras!"
                  </p>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold">JS</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">João Silva</p>
                      <p className="text-sm text-gray-600">Engenheiro, Porto</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">
                    "A segurança dos dados e a facilidade de partilhar informações com o meu marido fizeram toda a diferença na nossa organização financeira."
                  </p>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-semibold">AC</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Ana Costa</p>
                      <p className="text-sm text-gray-600">Professora, Coimbra</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-white">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Pronto para transformar as finanças da sua família?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de famílias portuguesas que já descobriram uma forma mais inteligente de gerir o dinheiro.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <a href="/register">
                  Começar Gratuitamente
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                <a href="/login">Já tenho conta</a>
              </Button>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Sem compromisso</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Dados seguros</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-green-500" />
                <span>Suporte em português</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">FamilyFlowFinance</span>
              </div>
              <div className="text-center md:text-right">
                <p className="text-gray-400 text-sm">
                  © 2025 FamilyFlowFinance. Todos os direitos reservados.
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Gestão financeira familiar inteligente e segura.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Fallback enquanto redireciona
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">FamilyFlowFinance</h1>
        <p className="text-xl text-muted-foreground">Gestão Financeira Familiar</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default Index;
