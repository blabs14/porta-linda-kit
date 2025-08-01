import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';

export interface FamilyExportData {
  family: any;
  members: any[];
  transactions: any[];
  accounts: any[];
  budgets: any[];
  goals: any[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface FamilyExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  dateRange: {
    start: string;
    end: string;
  };
  includeCharts?: boolean;
  includeMembers?: boolean;
  includeBudgets?: boolean;
  includeGoals?: boolean;
}

/**
 * Busca dados da família para exportação
 */
export const fetchFamilyExportData = async (
  familyId: string, 
  dateRange: { start: string; end: string }
): Promise<FamilyExportData> => {
  // Buscar dados da família
  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single();

  if (familyError) throw familyError;

  // Buscar membros da família
  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select(`
      *,
      profiles:user_id (
        id,
        nome,
        foto_url
      )
    `)
    .eq('family_id', familyId);

  if (membersError) throw membersError;

  // Buscar transações da família
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select(`
      *,
      accounts:account_id (
        nome,
        tipo
      ),
      categories:categoria_id (
        nome,
        cor
      ),
      profiles:user_id (
        nome
      )
    `)
    .eq('family_id', familyId)
    .gte('data', dateRange.start)
    .lte('data', dateRange.end)
    .order('data', { ascending: false });

  if (transactionsError) throw transactionsError;

  // Buscar contas da família
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .eq('family_id', familyId);

  if (accountsError) throw accountsError;

  // Buscar orçamentos da família (dos membros)
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select(`
      *,
      categories:categoria_id (
        nome,
        cor
      ),
      profiles:user_id (
        nome
      )
    `)
    .in('user_id', members.map(m => m.user_id))
    .gte('mes', dateRange.start.substring(0, 7))
    .lte('mes', dateRange.end.substring(0, 7));

  if (budgetsError) throw budgetsError;

  // Buscar objetivos da família
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select(`
      *,
      accounts:account_id (
        nome
      ),
      profiles:user_id (
        nome
      )
    `)
    .eq('family_id', familyId);

  if (goalsError) throw goalsError;

  return {
    family,
    members: members || [],
    transactions: transactions || [],
    accounts: accounts || [],
    budgets: budgets || [],
    goals: goals || [],
    dateRange
  };
};

/**
 * Exporta relatório familiar em PDF
 */
export const exportFamilyToPDF = async (
  data: FamilyExportData, 
  options: FamilyExportOptions
): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(20);
  doc.text('Relatório Familiar', 105, 20, { align: 'center' });
  
  // Informações da família
  doc.setFontSize(14);
  doc.text(`Família: ${data.family.nome}`, 20, 35);
  if (data.family.description) {
    doc.setFontSize(10);
    doc.text(`Descrição: ${data.family.description}`, 20, 45);
  }
  
  // Período
  doc.setFontSize(12);
  doc.text(`Período: ${new Date(options.dateRange.start).toLocaleDateString('pt-PT')} - ${new Date(options.dateRange.end).toLocaleDateString('pt-PT')}`, 20, 55);
  
  // Resumo financeiro
  const totalIncome = data.transactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const totalExpenses = data.transactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const balance = totalIncome - totalExpenses;
  
  doc.setFontSize(14);
  doc.text('Resumo Financeiro', 20, 70);
  doc.setFontSize(10);
  doc.text(`Receitas: ${totalIncome.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`, 20, 80);
  doc.text(`Despesas: ${totalExpenses.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`, 20, 90);
  doc.text(`Saldo: ${balance.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`, 20, 100);
  
  let currentY = 120;

  // Membros da família
  if (options.includeMembers && data.members.length > 0) {
    doc.setFontSize(14);
    doc.text('Membros da Família', 20, currentY);
    currentY += 10;
    
    const memberData = data.members.map(m => [
      m.profiles?.nome || 'N/A',
      m.role,
      new Date(m.joined_at).toLocaleDateString('pt-PT')
    ]);
    
    autoTable(doc, {
      head: [['Nome', 'Papel', 'Data de Entrada']],
      body: memberData,
      startY: currentY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Transações
  if (data.transactions.length > 0) {
    doc.setFontSize(14);
    doc.text('Transações', 20, currentY);
    currentY += 10;
    
    const transactionData = data.transactions.map(t => [
      new Date(t.data).toLocaleDateString('pt-PT'),
      t.profiles?.nome || 'N/A',
      t.descricao || '-',
      t.tipo === 'receita' ? '+' : '-',
      Number(t.valor).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }),
      t.categories?.nome || '-',
      t.accounts?.nome || '-',
    ]);
    
    autoTable(doc, {
      head: [['Data', 'Membro', 'Descrição', 'Tipo', 'Valor', 'Categoria', 'Conta']],
      body: transactionData,
      startY: currentY,
      styles: {
        fontSize: 7,
        cellPadding: 1,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Orçamentos
  if (options.includeBudgets && data.budgets.length > 0) {
    doc.setFontSize(14);
    doc.text('Orçamentos', 20, currentY);
    currentY += 10;
    
    const budgetData = data.budgets.map(b => [
      b.profiles?.nome || 'N/A',
      b.categories?.nome || 'N/A',
      b.mes,
      Number(b.valor).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
    ]);
    
    autoTable(doc, {
      head: [['Membro', 'Categoria', 'Mês', 'Valor']],
      body: budgetData,
      startY: currentY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Objetivos
  if (options.includeGoals && data.goals.length > 0) {
    doc.setFontSize(14);
    doc.text('Objetivos', 20, currentY);
    currentY += 10;
    
    const goalData = data.goals.map(g => [
      g.nome,
      g.profiles?.nome || 'N/A',
      Number(g.valor_objetivo).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }),
      Number(g.valor_atual || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }),
      g.status || 'Ativo'
    ]);
    
    autoTable(doc, {
      head: [['Objetivo', 'Membro', 'Meta', 'Atual', 'Status']],
      body: goalData,
      startY: currentY,
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
 * Exporta relatório familiar em CSV
 */
export const exportFamilyToCSV = (
  data: FamilyExportData, 
  options: FamilyExportOptions
): Blob => {
  const csvData: string[] = [];
  
  // Cabeçalho
  csvData.push('Relatório Familiar');
  csvData.push(`Família: ${data.family.nome}`);
  csvData.push(`Período: ${new Date(options.dateRange.start).toLocaleDateString('pt-PT')} - ${new Date(options.dateRange.end).toLocaleDateString('pt-PT')}`);
  csvData.push('');
  
  // Resumo financeiro
  const totalIncome = data.transactions
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const totalExpenses = data.transactions
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);
  
  const balance = totalIncome - totalExpenses;
  
  csvData.push('Resumo Financeiro');
  csvData.push(`Receitas,${totalIncome.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`);
  csvData.push(`Despesas,${totalExpenses.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`);
  csvData.push(`Saldo,${balance.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`);
  csvData.push('');
  
  // Membros
  if (options.includeMembers && data.members.length > 0) {
    csvData.push('Membros da Família');
    csvData.push('Nome,Papel,Data de Entrada');
    data.members.forEach(m => {
      csvData.push(`${m.profiles?.nome || 'N/A'},${m.role},${new Date(m.joined_at).toLocaleDateString('pt-PT')}`);
    });
    csvData.push('');
  }
  
  // Transações
  if (data.transactions.length > 0) {
    csvData.push('Transações');
    csvData.push('Data,Membro,Descrição,Tipo,Valor,Categoria,Conta');
    data.transactions.forEach(t => {
      csvData.push(`${new Date(t.data).toLocaleDateString('pt-PT')},${t.profiles?.nome || 'N/A'},"${t.descricao || '-'}",${t.tipo},${Number(t.valor).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })},${t.categories?.nome || '-'},${t.accounts?.nome || '-'}`);
    });
    csvData.push('');
  }
  
  // Orçamentos
  if (options.includeBudgets && data.budgets.length > 0) {
    csvData.push('Orçamentos');
    csvData.push('Membro,Categoria,Mês,Valor');
    data.budgets.forEach(b => {
      csvData.push(`${b.profiles?.nome || 'N/A'},${b.categories?.nome || 'N/A'},${b.mes},${Number(b.valor).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`);
    });
    csvData.push('');
  }
  
  // Objetivos
  if (options.includeGoals && data.goals.length > 0) {
    csvData.push('Objetivos');
    csvData.push('Objetivo,Membro,Meta,Atual,Status');
    data.goals.forEach(g => {
      csvData.push(`${g.nome},${g.profiles?.nome || 'N/A'},${Number(g.valor_objetivo).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })},${Number(g.valor_atual || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })},${g.status || 'Ativo'}`);
    });
  }
  
  const csvContent = csvData.join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

/**
 * Exporta relatório familiar em Excel
 */
export const exportFamilyToExcel = (
  data: FamilyExportData, 
  options: FamilyExportOptions
): Blob => {
  const workbook = XLSX.utils.book_new();
  
  // Resumo
  const summaryData = [
    ['Relatório Familiar'],
    ['Família', data.family.nome],
    ['Período', `${new Date(options.dateRange.start).toLocaleDateString('pt-PT')} - ${new Date(options.dateRange.end).toLocaleDateString('pt-PT')}`],
    [''],
    ['Resumo Financeiro'],
    ['Receitas', data.transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + Number(t.valor), 0)],
    ['Despesas', data.transactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Number(t.valor), 0)],
    ['Saldo', data.transactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + Number(t.valor), 0) - data.transactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Number(t.valor), 0)],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
  
  // Membros
  if (options.includeMembers && data.members.length > 0) {
    const memberData = [
      ['Nome', 'Papel', 'Data de Entrada'],
      ...data.members.map(m => [
        m.profiles?.nome || 'N/A',
        m.role,
        new Date(m.joined_at).toLocaleDateString('pt-PT')
      ])
    ];
    
    const memberSheet = XLSX.utils.aoa_to_sheet(memberData);
    XLSX.utils.book_append_sheet(workbook, memberSheet, 'Membros');
  }
  
  // Transações
  if (data.transactions.length > 0) {
    const transactionData = [
      ['Data', 'Membro', 'Descrição', 'Tipo', 'Valor', 'Categoria', 'Conta'],
      ...data.transactions.map(t => [
        new Date(t.data).toLocaleDateString('pt-PT'),
        t.profiles?.nome || 'N/A',
        t.descricao || '-',
        t.tipo,
        Number(t.valor),
        t.categories?.nome || '-',
        t.accounts?.nome || '-'
      ])
    ];
    
    const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transações');
  }
  
  // Orçamentos
  if (options.includeBudgets && data.budgets.length > 0) {
    const budgetData = [
      ['Membro', 'Categoria', 'Mês', 'Valor'],
      ...data.budgets.map(b => [
        b.profiles?.nome || 'N/A',
        b.categories?.nome || 'N/A',
        b.mes,
        Number(b.valor)
      ])
    ];
    
    const budgetSheet = XLSX.utils.aoa_to_sheet(budgetData);
    XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Orçamentos');
  }
  
  // Objetivos
  if (options.includeGoals && data.goals.length > 0) {
    const goalData = [
      ['Objetivo', 'Membro', 'Meta', 'Atual', 'Status'],
      ...data.goals.map(g => [
        g.nome,
        g.profiles?.nome || 'N/A',
        Number(g.valor_objetivo),
        Number(g.valor_atual || 0),
        g.status || 'Ativo'
      ])
    ];
    
    const goalSheet = XLSX.utils.aoa_to_sheet(goalData);
    XLSX.utils.book_append_sheet(workbook, goalSheet, 'Objetivos');
  }
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Função principal para exportar relatório familiar
 */
export const exportFamilyReport = async (
  familyId: string,
  options: FamilyExportOptions
): Promise<{ blob: Blob; filename: string }> => {
  const data = await fetchFamilyExportData(familyId, options.dateRange);
  
  let blob: Blob;
  let filename: string;
  
  const familyName = data.family.nome.replace(/[^a-zA-Z0-9]/g, '_');
  const dateRange = `${new Date(options.dateRange.start).toISOString().split('T')[0]}_${new Date(options.dateRange.end).toISOString().split('T')[0]}`;
  
  switch (options.format) {
    case 'pdf':
      blob = await exportFamilyToPDF(data, options);
      filename = `relatorio_familiar_${familyName}_${dateRange}.pdf`;
      break;
    case 'csv':
      blob = exportFamilyToCSV(data, options);
      filename = `relatorio_familiar_${familyName}_${dateRange}.csv`;
      break;
    case 'excel':
      blob = exportFamilyToExcel(data, options);
      filename = `relatorio_familiar_${familyName}_${dateRange}.xlsx`;
      break;
    default:
      throw new Error('Formato de exportação não suportado');
  }
  
  return { blob, filename };
}; 