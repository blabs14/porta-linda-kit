import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { usePerformanceMonitoring, PerformanceMetric, PerformanceDashboard } from '@/services/performanceService';
import { Activity, Zap, Clock, AlertTriangle, Users, HardDrive } from 'lucide-react';

const PerformanceDashboardComponent: React.FC = () => {
  const { getDashboardData, getMetrics, clearMetrics } = usePerformanceMonitoring();
  const [dashboardData, setDashboardData] = useState<PerformanceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = () => {
    setIsLoading(true);
    try {
      const data = getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'bg-green-500';
      case 'needs-improvement': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRatingBadgeVariant = (rating: string) => {
    switch (rating) {
      case 'good': return 'default';
      case 'needs-improvement': return 'secondary';
      case 'poor': return 'destructive';
      default: return 'outline';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getLatestMetricByName = (metrics: PerformanceMetric[], name: string) => {
    return metrics
      .filter(m => m.name === name)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  };

  const calculateAveragePageLoad = (pageLoadTimes: number[]) => {
    if (pageLoadTimes.length === 0) return 0;
    return pageLoadTimes.reduce((sum, time) => sum + time, 0) / pageLoadTimes.length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">A carregar métricas de performance...</span>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Dashboard de Performance
          </CardTitle>
          <CardDescription>
            Não há dados de performance disponíveis. As métricas são coletadas automaticamente em produção.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { coreWebVitals, bundleMetrics, pageLoadTimes, errorRate, userSessions } = dashboardData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Dashboard de Performance
          </h2>
          <p className="text-muted-foreground">
            Monitorização em tempo real das métricas de performance da aplicação
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={clearMetrics} variant="outline" size="sm">
            Limpar Dados
          </Button>
        </div>
      </div>

      <Tabs defaultValue="vitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="bundle">Bundle & Recursos</TabsTrigger>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].map((metricName) => {
              const metric = getLatestMetricByName(coreWebVitals, metricName);
              
              return (
                <Card key={metricName}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      {metricName}
                      {metric && (
                        <Badge variant={getRatingBadgeVariant(metric.rating)}>
                          {metric.rating}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metric ? (
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">
                          {metricName === 'CLS' 
                            ? metric.value.toFixed(3)
                            : formatTime(metric.value)
                          }
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getRatingColor(metric.rating)}`}
                            style={{ 
                              width: `${Math.min(100, (metric.value / (metricName === 'CLS' ? 0.25 : 4000)) * 100)}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Última medição: {new Date(metric.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        Sem dados disponíveis
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="bundle" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Tamanho do Bundle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm">{formatBytes(bundleMetrics.totalSize)}</span>
                  </div>
                  <Progress value={Math.min(100, (bundleMetrics.totalSize / (1024 * 1024)) * 10)} />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">JavaScript</span>
                    <span className="text-sm">{formatBytes(bundleMetrics.chunkSizes.js || 0)}</span>
                  </div>
                  <Progress value={Math.min(100, ((bundleMetrics.chunkSizes.js || 0) / bundleMetrics.totalSize) * 100)} />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">CSS</span>
                    <span className="text-sm">{formatBytes(bundleMetrics.chunkSizes.css || 0)}</span>
                  </div>
                  <Progress value={Math.min(100, ((bundleMetrics.chunkSizes.css || 0) / bundleMetrics.totalSize) * 100)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tempo de Carregamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {formatTime(bundleMetrics.loadTime)}
                  </div>
                  <p className="text-sm text-muted-foreground">Tempo total de carregamento</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-semibold">
                    {bundleMetrics.resourceCount}
                  </div>
                  <p className="text-sm text-muted-foreground">Recursos carregados</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Tempo Médio de Carregamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {formatTime(calculateAveragePageLoad(pageLoadTimes))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Baseado em {pageLoadTimes.length} carregamentos
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Taxa de Erro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {errorRate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Erros por sessão
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sessões de Utilizador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {userSessions}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sessões ativas
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {coreWebVitals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Métricas</CardTitle>
                <CardDescription>
                  Últimas {coreWebVitals.length} métricas coletadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {coreWebVitals
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 10)
                    .map((metric, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant={getRatingBadgeVariant(metric.rating)}>
                            {metric.name}
                          </Badge>
                          <span className="font-medium">
                            {metric.name === 'CLS' 
                              ? metric.value.toFixed(3)
                              : formatTime(metric.value)
                            }
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(metric.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboardComponent;