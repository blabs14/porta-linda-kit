import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';

export interface ExportData {
  transactions: any[];
  accounts: any[];
  categories: any[];
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
}

interface CategoryStats {
  receitas: number;
  despesas: number;
}

/**
 * Exporta relatório em formato PDF
 */
export const exportToPDF = async (data: ExportData, options: ExportOptions): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(20);
  doc.text('Relatório Financeiro', 105, 20, { align: 'center' });
  
  // Período
  doc.setFontSize(12);
  doc.text(`Período: ${new Date(options.dateRange.start).toLocaleDateString('pt-PT')} - ${new Date(options.dateRange.end).toLocaleDateString('pt-PT')}`, 20, 35);
  
  // Resumo
  const totalIncome = data.transactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const totalExpenses = data.transactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const balance = totalIncome - totalExpenses;
  
  doc.setFontSize(14);
  doc.text('Resumo Financeiro', 20, 50);
  doc.setFontSize(10);
  doc.text(`Receitas: ${totalIncome.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`, 20, 60);
  doc.text(`Despesas: ${totalExpenses.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`, 20, 70);
  doc.text(`Saldo: ${balance.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`, 20, 80);
  
  // Tabela de transações
  if (data.transactions.length > 0) {
    doc.setFontSize(14);
    doc.text('Transações', 20, 100);
    
    const tableData = data.transactions.map(t => [
      new Date(t.data).toLocaleDateString('pt-PT'),
      t.descricao || '-',
      t.tipo === 'receita' ? '+' : '-',
      Number(t.valor).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }),
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
    const categoryStats = data.transactions.reduce((acc, t) => {
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
    }, {} as Record<string, CategoryStats>);
    
    const categoryData = Object.entries(categoryStats).map(([category, stats]) => [
      category,
      (stats as CategoryStats).receitas.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }),
      (stats as CategoryStats).despesas.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }),
    ]);
    
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Estatísticas por Categoria', 20, 20);
    
    autoTable(doc, {
      head: [['Categoria', 'Receitas', 'Despesas']],
      body: categoryData,
      startY: 30,
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
  
  return doc.output('blob');
};

/**
 * Exporta relatório em formato CSV
 */
export const exportToCSV = (data: ExportData, options: ExportOptions): Blob => {
  const headers = ['Data', 'Descrição', 'Tipo', 'Valor', 'Categoria', 'Conta'];
  const csvData = data.transactions.map(t => [
    new Date(t.data).toLocaleDateString('pt-PT'),
    t.descricao || '',
    t.tipo,
    Number(t.valor).toFixed(2),
    t.categoria_nome || '',
    t.account_nome || '',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

/**
 * Exporta relatório em formato Excel
 */
export const exportToExcel = (data: ExportData, options: ExportOptions): Blob => {
  const workbook = XLSX.utils.book_new();
  
  // Planilha de transações
  const transactionData = data.transactions.map(t => ({
    Data: new Date(t.data).toLocaleDateString('pt-PT'),
    Descrição: t.descricao || '',
    Tipo: t.tipo,
    Valor: Number(t.valor),
    Categoria: t.categoria_nome || '',
    Conta: t.account_nome || '',
  }));
  
  const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
  XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transações');
  
  // Planilha de estatísticas
  const categoryStats = data.transactions.reduce((acc, t) => {
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
  }, {} as Record<string, CategoryStats>);
  
  const statsData = Object.entries(categoryStats).map(([category, stats]) => ({
    Categoria: category,
    Receitas: (stats as CategoryStats).receitas,
    Despesas: (stats as CategoryStats).despesas,
    Saldo: (stats as CategoryStats).receitas - (stats as CategoryStats).despesas,
  }));
  
  const statsSheet = XLSX.utils.json_to_sheet(statsData);
  XLSX.utils.book_append_sheet(workbook, statsSheet, 'Estatísticas');
  
  // Planilha de resumo
  const totalIncome = data.transactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const totalExpenses = data.transactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const summaryData = [
    { Item: 'Receitas Totais', Valor: totalIncome },
    { Item: 'Despesas Totais', Valor: totalExpenses },
    { Item: 'Saldo', Valor: totalIncome - totalExpenses },
  ];
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
  
  // Usar a sintaxe correta para gerar o blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Busca dados para exportação
 */
export const fetchExportData = async (userId: string, dateRange: { start: string; end: string }): Promise<ExportData> => {
  // Buscar transações
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
  
  if (transactionsError) throw transactionsError;
  
  // Buscar contas
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);
  
  if (accountsError) throw accountsError;
  
  // Buscar categorias
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId);
  
  if (categoriesError) throw categoriesError;
  
  // Processar dados
  const processedTransactions = (transactions || []).map(t => ({
    ...t,
    categoria_nome: t.categories?.nome || 'Sem categoria',
    account_nome: t.accounts?.nome || 'Sem conta',
  }));
  
  return {
    transactions: processedTransactions,
    accounts: accounts || [],
    categories: categories || [],
    dateRange,
  };
};

/**
 * Função principal de exportação
 */
export const exportReport = async (
  userId: string,
  options: ExportOptions
): Promise<{ blob: Blob; filename: string }> => {
  const data = await fetchExportData(userId, options.dateRange);
  
  let blob: Blob;
  let filename: string;
  
  const dateRangeStr = `${new Date(options.dateRange.start).toISOString().split('T')[0]}_${new Date(options.dateRange.end).toISOString().split('T')[0]}`;
  
  switch (options.format) {
    case 'pdf':
      blob = await exportToPDF(data, options);
      filename = `relatorio_financeiro_${dateRangeStr}.pdf`;
      break;
    case 'csv':
      blob = exportToCSV(data, options);
      filename = `relatorio_financeiro_${dateRangeStr}.csv`;
      break;
    case 'excel':
      blob = exportToExcel(data, options);
      filename = `relatorio_financeiro_${dateRangeStr}.xlsx`;
      break;
    default:
      throw new Error('Formato não suportado');
  }
  
  return { blob, filename };
}; 