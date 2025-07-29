import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';

// Tipos mais específicos
export interface Transaction {
  id: string;
  data: string;
  descricao: string | null;
  valor: number;
  tipo: string; // Pode ser 'receita' ou 'despesa'
  categoria_nome: string;
  account_nome: string;
  categories?: { nome: string };
  accounts?: { nome: string };
  // Campos adicionais da base de dados
  account_id: string;
  categoria_id: string;
  created_at: string | null;
  family_id: string | null;
  goal_id: string | null;
  user_id: string;
}

export interface Account {
  id: string;
  nome: string;
  saldo: number;
  tipo: string;
  created_at: string | null;
  family_id?: string | null;
  user_id: string;
}

export interface Category {
  id: string;
  nome: string;
  cor: string;
  created_at: string;
  family_id: string;
  user_id: string;
}

export interface ExportData {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  dateRange: {
    start: string;
    end: string;
  };
  includeCharts?: boolean;
  currency?: string;
  locale?: string;
  template?: ReportTemplate;
  compress?: boolean;
}

export interface ExportResult {
  data: { blob: Blob; filename: string } | null;
  error: any;
}

export interface ReportTemplate {
  id: string;
  name: string;
  userId: string;
  layout: {
    header?: boolean;
    footer?: boolean;
    summary?: boolean;
    charts?: boolean;
    transactions?: boolean;
    categories?: boolean;
  };
  styling: {
    primaryColor?: string;
    secondaryColor?: string;
    fontSize?: number;
    fontFamily?: string;
  };
  customFields?: Record<string, any>;
}

export interface BatchExportOptions {
  reports: Array<{
    type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
    dateRange?: { start: string; end: string };
    format: 'pdf' | 'csv' | 'excel';
    template?: string;
  }>;
  compress?: boolean;
  email?: string;
}

export interface ScheduledExport {
  id: string;
  userId: string;
  name: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  options: ExportOptions;
  email: string;
  active: boolean;
  lastRun?: string;
  nextRun?: string;
}

// Cache para relatórios frequentes
class ReportCache {
  private cache = new Map<string, { data: ExportData; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  generateKey(userId: string, dateRange: { start: string; end: string }): string {
    return `${userId}_${dateRange.start}_${dateRange.end}`;
  }

  get(key: string): ExportData | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: ExportData, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const reportCache = new ReportCache();

// Constantes
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_LOCALE = 'pt-PT';
const DEFAULT_FILENAME_PREFIX = 'relatorio_financeiro';

// Funções utilitárias
const formatCurrency = (value: number, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE): string => {
  return value.toLocaleString(locale, { style: 'currency', currency });
};

const formatDate = (date: string, locale = DEFAULT_LOCALE): string => {
  return new Date(date).toLocaleDateString(locale);
};

const calculateFinancialSummary = (transactions: Transaction[]) => {
  const totalIncome = transactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const totalExpenses = transactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const balance = totalIncome - totalExpenses;
  
  return { totalIncome, totalExpenses, balance };
};

const calculateCategoryStats = (transactions: Transaction[]) => {
  return transactions.reduce((acc, t) => {
    const category = t.categoria_nome || 'Sem categoria';
    if (!acc[category]) {
      acc[category] = { receitas: 0, despesas: 0, total: 0 };
    }
    
    if (t.tipo === 'receita') {
      acc[category].receitas += Number(t.valor);
    } else {
      acc[category].despesas += Number(t.valor);
    }
    acc[category].total += Number(t.valor);
    
    return acc;
  }, {} as Record<string, { receitas: number; despesas: number; total: number }>);
};

const generateFilename = (format: string, dateRange: { start: string; end: string }): string => {
  const startDate = new Date(dateRange.start).toISOString().split('T')[0];
  const endDate = new Date(dateRange.end).toISOString().split('T')[0];
  return `${DEFAULT_FILENAME_PREFIX}_${startDate}_${endDate}.${format}`;
};

// Função para comprimir dados
const compressData = async (data: Blob): Promise<Blob> => {
  try {
    // Usar a API de compressão do navegador se disponível
    if ('CompressionStream' in window) {
      const stream = data.stream().pipeThrough(new CompressionStream('gzip'));
      return new Response(stream).blob();
    }
    
    // Fallback: retornar dados originais se compressão não estiver disponível
    return data;
  } catch (error) {
    console.warn('Compressão não disponível, retornando dados originais:', error);
    return data;
  }
};

// Função para gerar gráficos em base64 (simulado)
const generateChartImage = async (data: any, type: 'pie' | 'bar' | 'line'): Promise<string> => {
  // Em uma implementação real, usaríamos Chart.js ou similar
  // Por agora, retornamos uma imagem placeholder
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Gráfico ${type} - Dados simulados`, 200, 150);
  }
  
  return canvas.toDataURL('image/png');
};

// Função para aplicar template personalizado
const applyTemplate = (data: ExportData, template: ReportTemplate): ExportData => {
  // Aplicar personalizações do template
  // Por enquanto, retornamos os dados originais
  return data;
};

/**
 * Exporta relatório em formato PDF
 */
export const exportToPDF = async (
  data: ExportData, 
  options: ExportOptions
): Promise<{ data: Blob | null; error: any }> => {
  try {
    const doc = new jsPDF();
    const { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE } = options;
    
    // Título
    doc.setFontSize(20);
    doc.text('Relatório Financeiro', 105, 20, { align: 'center' });
    
    // Período
    doc.setFontSize(12);
    doc.text(
      `Período: ${formatDate(options.dateRange.start, locale)} - ${formatDate(options.dateRange.end, locale)}`, 
      20, 
      35
    );
    
    // Resumo financeiro
    const { totalIncome, totalExpenses, balance } = calculateFinancialSummary(data.transactions);
    
    doc.setFontSize(14);
    doc.text('Resumo Financeiro', 20, 50);
    doc.setFontSize(10);
    doc.text(`Receitas: ${formatCurrency(totalIncome, currency, locale)}`, 20, 60);
    doc.text(`Despesas: ${formatCurrency(totalExpenses, currency, locale)}`, 20, 70);
    doc.text(`Saldo: ${formatCurrency(balance, currency, locale)}`, 20, 80);
    
    // Tabela de transações
    if (data.transactions.length > 0) {
      doc.setFontSize(14);
      doc.text('Transações', 20, 100);
      
      const tableData = data.transactions.map(t => [
        formatDate(t.data, locale),
        t.descricao || '-',
        t.tipo === 'receita' ? '+' : '-',
        formatCurrency(Number(t.valor), currency, locale),
        t.categoria_nome || '-',
        t.account_nome || '-',
      ]);
      
      autoTable(doc, {
        head: [['Data', 'Descrição', 'Tipo', 'Valor', 'Categoria', 'Conta']],
        body: tableData,
        startY: 110,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
        },
      });
    }
    
    // Estatísticas por categoria
    if (data.transactions.length > 0) {
      const categoryStats = calculateCategoryStats(data.transactions);
      const categoryEntries = Object.entries(categoryStats);
      
      if (categoryEntries.length > 0) {
        doc.setFontSize(14);
        doc.text('Estatísticas por Categoria', 20, 200);
        
        const categoryTableData = categoryEntries.map(([category, stats]) => [
          category,
          formatCurrency(stats.receitas, currency, locale),
          formatCurrency(stats.despesas, currency, locale),
          formatCurrency(stats.receitas - stats.despesas, currency, locale),
        ]);
        
        autoTable(doc, {
          head: [['Categoria', 'Receitas', 'Despesas', 'Saldo']],
          body: categoryTableData,
          startY: 210,
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
          },
        });
      }
    }
    
    const blob = doc.output('blob');
    return { data: blob, error: null };
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return { data: null, error };
  }
};

/**
 * Exporta relatório em formato CSV
 */
export const exportToCSV = (
  data: ExportData, 
  options: ExportOptions
): { data: Blob | null; error: any } => {
  try {
    const { locale = DEFAULT_LOCALE } = options;
    const headers = ['Data', 'Descrição', 'Tipo', 'Valor', 'Categoria', 'Conta'];
    
    const csvContent = [
      headers.join(','),
      ...data.transactions.map(t => [
        formatDate(t.data, locale),
        `"${(t.descricao || '').replace(/"/g, '""')}"`,
        t.tipo,
        t.valor,
        `"${(t.categoria_nome || '').replace(/"/g, '""')}"`,
        `"${(t.account_nome || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return { data: blob, error: null };
  } catch (error) {
    console.error('Erro ao gerar CSV:', error);
    return { data: null, error };
  }
};

/**
 * Exporta relatório em formato Excel
 */
export const exportToExcel = (
  data: ExportData, 
  options: ExportOptions
): { data: Blob | null; error: any } => {
  try {
    const { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE } = options;
    const workbook = XLSX.utils.book_new();
    
    // Dados das transações
    const transactionData = data.transactions.map(t => ({
      Data: formatDate(t.data, locale),
      Descrição: t.descricao || '',
      Tipo: t.tipo,
      Valor: Number(t.valor),
      Categoria: t.categoria_nome || '',
      Conta: t.account_nome || '',
    }));
    
    const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transações');
    
    // Estatísticas por categoria
    if (data.transactions.length > 0) {
      const categoryStats = calculateCategoryStats(data.transactions);
      
      const categoryData = Object.entries(categoryStats).map(([category, stats]) => ({
        Categoria: category,
        Receitas: stats.receitas,
        Despesas: stats.despesas,
        Saldo: stats.receitas - stats.despesas,
      }));
      
      const categorySheet = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Estatísticas por Categoria');
    }
    
    // Resumo geral
    const { totalIncome, totalExpenses, balance } = calculateFinancialSummary(data.transactions);
    
    const summaryData = [
      { Item: 'Receitas Totais', Valor: totalIncome },
      { Item: 'Despesas Totais', Valor: totalExpenses },
      { Item: 'Saldo', Valor: balance },
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
    
    const blob = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as Blob;
    return { data: blob, error: null };
  } catch (error) {
    console.error('Erro ao gerar Excel:', error);
    return { data: null, error };
  }
};

/**
 * Busca dados para exportação
 */
export const fetchExportData = async (
  userId: string, 
  dateRange: { start: string; end: string }
): Promise<{ data: ExportData | null; error: any }> => {
  try {
    console.log('[fetchExportData] Fetching data for user:', userId, 'dateRange:', dateRange);
    
    // Verificar cache primeiro
    const cacheKey = reportCache.generateKey(userId, dateRange);
    const cachedData = reportCache.get(cacheKey);
    
    if (cachedData) {
      console.log('[fetchExportData] Returning cached data');
      return { data: cachedData, error: null };
    }
    
    // Buscar transações com relacionamentos
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        *,
        categories(nome),
        accounts(nome)
      `)
      .eq('user_id', userId)
      .gte('data', dateRange.start)
      .lte('data', dateRange.end)
      .order('data', { ascending: false });
    
    if (transactionsError) {
      console.error('Erro ao buscar transações:', transactionsError);
      return { data: null, error: transactionsError };
    }
    
    // Buscar contas
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);
    
    if (accountsError) {
      console.error('Erro ao buscar contas:', accountsError);
      return { data: null, error: accountsError };
    }
    
    // Buscar categorias
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    
    if (categoriesError) {
      console.error('Erro ao buscar categorias:', categoriesError);
      return { data: null, error: categoriesError };
    }
    
    // Processar dados das transações
    const processedTransactions = (transactions || []).map(t => ({
      ...t,
      categoria_nome: t.categories?.nome || 'Sem categoria',
      account_nome: t.accounts?.nome || 'Sem conta',
    }));
    
    const exportData: ExportData = {
      transactions: processedTransactions,
      accounts: accounts || [],
      categories: categories || [],
      dateRange,
    };
    
    // Armazenar no cache
    reportCache.set(cacheKey, exportData);
    
    console.log('[fetchExportData] Successfully fetched data:', {
      transactionsCount: processedTransactions.length,
      accountsCount: accounts?.length || 0,
      categoriesCount: categories?.length || 0
    });
    
    return { data: exportData, error: null };
  } catch (error) {
    console.error('Erro ao buscar dados para exportação:', error);
    return { data: null, error };
  }
};

/**
 * Função principal de exportação
 */
export const exportReport = async (
  userId: string,
  options: ExportOptions
): Promise<ExportResult> => {
  try {
    // Validar parâmetros
    if (!userId) {
      return { data: null, error: new Error('ID do utilizador é obrigatório') };
    }
    
    if (!options.dateRange?.start || !options.dateRange?.end) {
      return { data: null, error: new Error('Intervalo de datas é obrigatório') };
    }
    
    // Buscar dados
    const { data: exportData, error: fetchError } = await fetchExportData(userId, options.dateRange);
    
    if (fetchError) {
      return { data: null, error: fetchError };
    }
    
    if (!exportData) {
      return { data: null, error: new Error('Dados de exportação não disponíveis') };
    }
    
    // Aplicar template personalizado se fornecido
    let processedData = exportData;
    if (options.template) {
      processedData = applyTemplate(exportData, options.template);
    }
    
    // Gerar relatório no formato solicitado
    let blob: Blob;
    
    switch (options.format) {
      case 'pdf': {
        const { data: pdfBlob, error: pdfError } = await exportToPDF(processedData, options);
        if (pdfError) {
          return { data: null, error: pdfError };
        }
        blob = pdfBlob!;
        break;
      }
      case 'csv': {
        const { data: csvBlob, error: csvError } = exportToCSV(processedData, options);
        if (csvError) {
          return { data: null, error: csvError };
        }
        blob = csvBlob!;
        break;
      }
      case 'excel': {
        const { data: excelBlob, error: excelError } = exportToExcel(processedData, options);
        if (excelError) {
          return { data: null, error: excelError };
        }
        blob = excelBlob!;
        break;
      }
      default:
        return { data: null, error: new Error(`Formato '${options.format}' não suportado`) };
    }
    
    // Comprimir se solicitado
    if (options.compress) {
      blob = await compressData(blob);
    }
    
    const filename = generateFilename(options.format, options.dateRange);
    
    return { data: { blob, filename }, error: null };
  } catch (error) {
    console.error('Erro na exportação:', error);
    return { data: null, error };
  }
}; 

/**
 * Exportação em lote de múltiplos relatórios
 */
export const batchExport = async (
  userId: string,
  options: BatchExportOptions
): Promise<{ data: { blobs: Blob[]; filenames: string[] } | null; error: any }> => {
  try {
    const blobs: Blob[] = [];
    const filenames: string[] = [];
    
    for (const report of options.reports) {
      // Calcular intervalo de datas baseado no tipo
      let dateRange: { start: string; end: string };
      
      if (report.type === 'custom' && report.dateRange) {
        dateRange = report.dateRange;
      } else {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        switch (report.type) {
          case 'monthly':
            dateRange = {
              start: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
              end: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
            };
            break;
          case 'quarterly':
            const quarter = Math.floor(currentMonth / 3);
            dateRange = {
              start: new Date(currentYear, quarter * 3, 1).toISOString().split('T')[0],
              end: new Date(currentYear, (quarter + 1) * 3, 0).toISOString().split('T')[0]
            };
            break;
          case 'yearly':
            dateRange = {
              start: new Date(currentYear, 0, 1).toISOString().split('T')[0],
              end: new Date(currentYear, 11, 31).toISOString().split('T')[0]
            };
            break;
          default:
            return { data: null, error: new Error('Tipo de relatório não suportado') };
        }
      }
      
      // Buscar template se especificado
      let template: ReportTemplate | undefined;
      if (report.template) {
        const { data: templateData } = await getReportTemplate(userId, report.template);
        template = templateData || undefined;
      }
      
      // Exportar relatório
      const { data: result, error } = await exportReport(userId, {
        format: report.format,
        dateRange,
        template,
        compress: options.compress
      });
      
      if (error) {
        console.error(`Erro ao exportar relatório ${report.type}:`, error);
        continue;
      }
      
      if (result) {
        blobs.push(result.blob);
        filenames.push(result.filename);
      }
    }
    
    if (blobs.length === 0) {
      return { data: null, error: new Error('Nenhum relatório foi exportado com sucesso') };
    }
    
    return { data: { blobs, filenames }, error: null };
  } catch (error) {
    console.error('Erro na exportação em lote:', error);
    return { data: null, error };
  }
};

/**
 * Gestão de templates de relatórios
 */
export const createReportTemplate = async (
  userId: string,
  template: Omit<ReportTemplate, 'id' | 'userId'>
): Promise<{ data: ReportTemplate | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .insert([{
        ...template,
        user_id: userId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar template:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao criar template:', error);
    return { data: null, error };
  }
};

export const getReportTemplates = async (
  userId: string
): Promise<{ data: ReportTemplate[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar templates:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return { data: null, error };
  }
};

export const getReportTemplate = async (
  userId: string,
  templateId: string
): Promise<{ data: ReportTemplate | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Erro ao buscar template:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar template:', error);
    return { data: null, error };
  }
};

export const updateReportTemplate = async (
  userId: string,
  templateId: string,
  updates: Partial<ReportTemplate>
): Promise<{ data: ReportTemplate | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('report_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar template:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    return { data: null, error };
  }
};

export const deleteReportTemplate = async (
  userId: string,
  templateId: string
): Promise<{ data: boolean | null; error: any }> => {
  try {
    const { error } = await supabase
      .from('report_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Erro ao eliminar template:', error);
      return { data: null, error };
    }
    
    return { data: true, error: null };
  } catch (error) {
    console.error('Erro ao eliminar template:', error);
    return { data: null, error };
  }
};

/**
 * Gestão de exportações agendadas
 */
export const createScheduledExport = async (
  userId: string,
  scheduledExport: Omit<ScheduledExport, 'id' | 'userId'>
): Promise<{ data: ScheduledExport | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('scheduled_exports')
      .insert([{
        ...scheduledExport,
        user_id: userId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar exportação agendada:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao criar exportação agendada:', error);
    return { data: null, error };
  }
};

export const getScheduledExports = async (
  userId: string
): Promise<{ data: ScheduledExport[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('scheduled_exports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar exportações agendadas:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar exportações agendadas:', error);
    return { data: null, error };
  }
};

export const updateScheduledExport = async (
  userId: string,
  scheduledExportId: string,
  updates: Partial<ScheduledExport>
): Promise<{ data: ScheduledExport | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('scheduled_exports')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduledExportId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar exportação agendada:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao atualizar exportação agendada:', error);
    return { data: null, error };
  }
};

export const deleteScheduledExport = async (
  userId: string,
  scheduledExportId: string
): Promise<{ data: boolean | null; error: any }> => {
  try {
    const { error } = await supabase
      .from('scheduled_exports')
      .delete()
      .eq('id', scheduledExportId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Erro ao eliminar exportação agendada:', error);
      return { data: null, error };
    }
    
    return { data: true, error: null };
  } catch (error) {
    console.error('Erro ao eliminar exportação agendada:', error);
    return { data: null, error };
  }
};

/**
 * Função para executar exportações agendadas
 * Esta função seria chamada por um cron job ou scheduler
 */
export const executeScheduledExports = async (): Promise<{ data: any | null; error: any }> => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const currentDayOfWeek = now.getDay(); // 0-6
    const currentDayOfMonth = now.getDate(); // 1-31
    
    // Buscar exportações agendadas ativas
    const { data: scheduledExports, error } = await supabase
      .from('scheduled_exports')
      .select('*')
      .eq('active', true);
    
    if (error) {
      console.error('Erro ao buscar exportações agendadas:', error);
      return { data: null, error };
    }
    
    const results = [];
    
    for (const scheduledExport of scheduledExports || []) {
      // Verificar se deve executar agora
      let shouldExecute = false;
      
      if (scheduledExport.schedule === 'daily' && scheduledExport.time === currentTime) {
        shouldExecute = true;
      } else if (scheduledExport.schedule === 'weekly' && 
                 scheduledExport.dayOfWeek === currentDayOfWeek && 
                 scheduledExport.time === currentTime) {
        shouldExecute = true;
      } else if (scheduledExport.schedule === 'monthly' && 
                 scheduledExport.dayOfMonth === currentDayOfMonth && 
                 scheduledExport.time === currentTime) {
        shouldExecute = true;
      }
      
      if (shouldExecute) {
        try {
          // Executar exportação
          const { data: exportResult, error: exportError } = await exportReport(
            scheduledExport.user_id,
            scheduledExport.options
          );
          
          if (exportError) {
            console.error(`Erro ao executar exportação agendada ${scheduledExport.id}:`, exportError);
            continue;
          }
          
          // Enviar por email se especificado
          if (scheduledExport.email && exportResult) {
            // Aqui implementaríamos o envio por email
            console.log(`Enviando relatório para ${scheduledExport.email}`);
          }
          
          // Atualizar última execução
          await updateScheduledExport(scheduledExport.user_id, scheduledExport.id, {
            lastRun: now.toISOString(),
            nextRun: calculateNextRun(scheduledExport)
          });
          
          results.push({
            id: scheduledExport.id,
            success: true,
            email: scheduledExport.email
          });
          
        } catch (executionError) {
          console.error(`Erro ao executar exportação agendada ${scheduledExport.id}:`, executionError);
          results.push({
            id: scheduledExport.id,
            success: false,
            error: executionError
          });
        }
      }
    }
    
    return { data: results, error: null };
  } catch (error) {
    console.error('Erro ao executar exportações agendadas:', error);
    return { data: null, error };
  }
};

// Função auxiliar para calcular próxima execução
const calculateNextRun = (scheduledExport: ScheduledExport): string => {
  const now = new Date();
  
  switch (scheduledExport.schedule) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly':
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      return nextMonth.toISOString();
    default:
      return now.toISOString();
  }
};

// Função para limpar cache expirado
export const clearExpiredCache = (): void => {
  reportCache.clearExpired();
};

// Função para limpar todo o cache
export const clearAllCache = (): void => {
  reportCache.clear();
}; 