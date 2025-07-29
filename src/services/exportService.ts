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
}

export interface ExportResult {
  data: { blob: Blob; filename: string } | null;
  error: any;
}

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
      acc[category] = { receitas: 0, despesas: 0 };
    }
    if (t.tipo === 'receita') {
      acc[category].receitas += Number(t.valor);
    } else {
      acc[category].despesas += Number(t.valor);
    }
    return acc;
  }, {} as Record<string, { receitas: number; despesas: number }>);
};

const generateFilename = (format: string, dateRange: { start: string; end: string }): string => {
  const dateRangeStr = `${new Date(dateRange.start).toISOString().split('T')[0]}_${new Date(dateRange.end).toISOString().split('T')[0]}`;
  return `${DEFAULT_FILENAME_PREFIX}_${dateRangeStr}.${format}`;
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
    
    // Gerar relatório no formato solicitado
    let blob: Blob;
    
    switch (options.format) {
      case 'pdf': {
        const { data: pdfBlob, error: pdfError } = await exportToPDF(exportData, options);
        if (pdfError) {
          return { data: null, error: pdfError };
        }
        blob = pdfBlob!;
        break;
      }
      case 'csv': {
        const { data: csvBlob, error: csvError } = exportToCSV(exportData, options);
        if (csvError) {
          return { data: null, error: csvError };
        }
        blob = csvBlob!;
        break;
      }
      case 'excel': {
        const { data: excelBlob, error: excelError } = exportToExcel(exportData, options);
        if (excelError) {
          return { data: null, error: excelError };
        }
        blob = excelBlob!;
        break;
      }
      default:
        return { data: null, error: new Error(`Formato '${options.format}' não suportado`) };
    }
    
    const filename = generateFilename(options.format, options.dateRange);
    
    return { data: { blob, filename }, error: null };
  } catch (error) {
    console.error('Erro na exportação:', error);
    return { data: null, error };
  }
}; 