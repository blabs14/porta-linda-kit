import { logger } from '@/shared/lib/logger';

// Importação lazy para evitar problemas de build
let webVitalsModule: any = null;

const loadWebVitals = async () => {
  if (!webVitalsModule) {
    try {
      webVitalsModule = await import('web-vitals');
    } catch (error) {
      logger.warn('Web Vitals não disponível:', error);
      return null;
    }
  }
  return webVitalsModule;
};

// Tipos para métricas de performance
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface BundleMetrics {
  totalSize: number;
  chunkSizes: Record<string, number>;
  loadTime: number;
  resourceCount: number;
}

export interface PerformanceDashboard {
  coreWebVitals: PerformanceMetric[];
  bundleMetrics: BundleMetrics;
  pageLoadTimes: number[];
  errorRate: number;
  userSessions: number;
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private isProduction = import.meta.env.PROD;
  private apiEndpoint = import.meta.env.VITE_PERFORMANCE_API_ENDPOINT;

  constructor() {
    if (this.isProduction) {
      this.initializeWebVitals();
      this.initializeResourceTiming();
      this.initializeNavigationTiming();
    }
  }

  private async initializeWebVitals() {
    const webVitals = await loadWebVitals();
    if (!webVitals) return;

    const { getCLS, getFID, getFCP, getLCP, getTTFB } = webVitals;

    // Cumulative Layout Shift
    getCLS((metric: any) => {
      this.recordMetric({
        name: 'CLS',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // First Input Delay
    getFID((metric: any) => {
      this.recordMetric({
        name: 'FID',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // First Contentful Paint
    getFCP((metric: any) => {
      this.recordMetric({
        name: 'FCP',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Largest Contentful Paint
    getLCP((metric: any) => {
      this.recordMetric({
        name: 'LCP',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Time to First Byte
    getTTFB((metric: any) => {
      this.recordMetric({
        name: 'TTFB',
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });
  }

  private initializeResourceTiming() {
    // Monitorizar carregamento de recursos
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Registar recursos lentos (>1s)
          if (resourceEntry.duration > 1000) {
            this.recordMetric({
              name: 'SLOW_RESOURCE',
              value: resourceEntry.duration,
              rating: 'poor',
              timestamp: Date.now(),
              url: resourceEntry.name,
              userAgent: navigator.userAgent
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private initializeNavigationTiming() {
    // Monitorizar navegação entre páginas
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          this.recordMetric({
            name: 'PAGE_LOAD',
            value: navEntry.loadEventEnd - navEntry.navigationStart,
            rating: navEntry.loadEventEnd - navEntry.navigationStart < 2000 ? 'good' : 'poor',
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
          });
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });
  }

  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Enviar para API se configurada
    if (this.apiEndpoint) {
      this.sendMetricToAPI(metric);
    }

    // Armazenar localmente para dashboard
    this.storeMetricLocally(metric);

    // Log em desenvolvimento
    if (!this.isProduction) {
      logger.debug('Performance Metric:', metric);
    }
  }

  private async sendMetricToAPI(metric: PerformanceMetric) {
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      });
    } catch (error) {
      logger.error('Erro ao enviar métrica:', error);
    }
  }

  private storeMetricLocally(metric: PerformanceMetric) {
    const stored = localStorage.getItem('performance_metrics');
    const metrics = stored ? JSON.parse(stored) : [];
    
    metrics.push(metric);
    
    // Manter apenas últimas 100 métricas
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
    
    localStorage.setItem('performance_metrics', JSON.stringify(metrics));
  }

  public getBundleMetrics(): BundleMetrics {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const jsResources = resources.filter(r => r.name.endsWith('.js'));
    const cssResources = resources.filter(r => r.name.endsWith('.css'));
    
    const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const loadTime = resources.reduce((max, r) => Math.max(max, r.responseEnd), 0);
    
    return {
      totalSize,
      chunkSizes: {
        js: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        css: cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      },
      loadTime,
      resourceCount: resources.length
    };
  }

  public getStoredMetrics(): PerformanceMetric[] {
    const stored = localStorage.getItem('performance_metrics');
    return stored ? JSON.parse(stored) : [];
  }

  public getDashboardData(): PerformanceDashboard {
    const metrics = this.getStoredMetrics();
    const bundleMetrics = this.getBundleMetrics();
    
    const pageLoadTimes = metrics
      .filter(m => m.name === 'PAGE_LOAD')
      .map(m => m.value);
    
    const errorRate = this.calculateErrorRate();
    const userSessions = this.getUserSessionCount();
    
    return {
      coreWebVitals: metrics.filter(m => ['CLS', 'FID', 'FCP', 'LCP', 'TTFB'].includes(m.name)),
      bundleMetrics,
      pageLoadTimes,
      errorRate,
      userSessions
    };
  }

  private calculateErrorRate(): number {
    // Implementar cálculo de taxa de erro baseado em logs
    const errorLogs = localStorage.getItem('error_logs');
    if (!errorLogs) return 0;
    
    const errors = JSON.parse(errorLogs);
    const totalSessions = this.getUserSessionCount();
    
    return totalSessions > 0 ? (errors.length / totalSessions) * 100 : 0;
  }

  private getUserSessionCount(): number {
    // Implementar contagem de sessões de utilizador
    const sessions = localStorage.getItem('user_sessions');
    return sessions ? JSON.parse(sessions).length : 1;
  }

  public clearMetrics() {
    this.metrics = [];
    localStorage.removeItem('performance_metrics');
  }

  // Método para monitorizar performance de componentes React
  public measureComponentRender(componentName: string, renderFunction: () => void) {
    const startTime = performance.now();
    renderFunction();
    const endTime = performance.now();
    
    this.recordMetric({
      name: 'COMPONENT_RENDER',
      value: endTime - startTime,
      rating: endTime - startTime < 16 ? 'good' : 'poor', // 60fps = 16ms por frame
      timestamp: Date.now(),
      url: `component:${componentName}`,
      userAgent: navigator.userAgent
    });
  }
}

// Instância singleton
export const performanceService = new PerformanceService();

// Hook para usar em componentes React
export const usePerformanceMonitoring = () => {
  return {
    measureRender: performanceService.measureComponentRender.bind(performanceService),
    getDashboardData: performanceService.getDashboardData.bind(performanceService),
    getMetrics: performanceService.getStoredMetrics.bind(performanceService),
    clearMetrics: performanceService.clearMetrics.bind(performanceService)
  };
};