import { calculatePayroll } from './calculation.service';
import { payrollService } from './payrollService';

export interface PayrollExportData {
  period: {
    month: number;
    year: number;
    monthName: string;
  };
  totals: {
    base: number;
    overtimeDay: number;
    overtimeNight: number;
    overtimeWeekend: number;
    overtimeHoliday: number;
    meal: number;
    vacation: number;
    christmas: number;
    mileage: number;
    gross: number;
    net: number;
  };
  hours: Array<{
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    total_hours: number;
    overtime_day: number;
    overtime_night: number;
    overtime_weekend: number;
    overtime_holiday: number;
    notes?: string;
  }>;
  mileage: Array<{
    date: string;
    kilometers: number;
    origin: string;
    destination: string;
    purpose: string;
    amount: number;
  }>;
  config: {
    contract?: any;
    overtimePolicy?: any;
    mealAllowance?: any;
    mileagePolicy?: any;
  };
}

export interface PayrollExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  dateRange: {
    start: string;
    end: string;
  };
  includeHours?: boolean;
  includeMileage?: boolean;
  includeConfig?: boolean;
}

/**
 * Busca dados do payroll para exportação
 */
export const fetchPayrollExportData = async (
  userId: string,
  year: number,
  month: number
): Promise<PayrollExportData> => {
  try {
    // Obter contrato ativo
    const contractData = await payrollService.getActiveContract(userId);
    if (!contractData?.id) {
      throw new Error('Nenhum contrato ativo encontrado');
    }

    // Calcular totais do payroll
    const payrollResult = await calculatePayroll(userId, contractData.id, year, month);
    
    // Buscar horas trabalhadas
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const hoursData = await payrollService.getTimeEntries(userId, startDate, endDate, contractData.id);
    
    // Buscar viagens de quilometragem
    const mileageData = await payrollService.getMileageTrips(userId, startDate, endDate);
    
    // Buscar configurações
    const [overtimePolicyData, mealAllowanceData, mileagePolicyData] = await Promise.all([
      payrollService.getActiveOTPolicy(userId),
      payrollService.getMealAllowanceConfig(userId, contractData.id),
      payrollService.getActiveMileagePolicy(userId),
    ]);
    
    const monthName = new Date(year, month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    
    return {
      period: {
        month,
        year,
        monthName
      },
      totals: {
        base: payrollResult.baseSalary,
        overtimeDay: payrollResult.overtimeDay,
        overtimeNight: payrollResult.overtimeNight,
        overtimeWeekend: payrollResult.overtimeWeekend,
        overtimeHoliday: payrollResult.overtimeHoliday,
        meal: payrollResult.mealAllowance,
        vacation: payrollResult.vacationAllowance,
        christmas: payrollResult.christmasAllowance,
        mileage: payrollResult.mileageAllowance,
        gross: payrollResult.grossSalary,
        net: payrollResult.netSalary
      },
      hours: hoursData || [],
      mileage: mileageData || [],
      config: {
        contract: contractData,
        overtimePolicy: overtimePolicyData,
        mealAllowance: mealAllowanceData,
        mileagePolicy: mileagePolicyData
      }
    };
  } catch (error) {
    console.error('Error fetching payroll export data:', error);
    throw new Error('Erro ao buscar dados para exportação');
  }
};

/**
 * Exporta dados do payroll para CSV
 */
/**
 * Escapes CSV field content and wraps in quotes if necessary
 */
const escapeCsvField = (value: string | number): string => {
  const strValue = String(value);
  
  // If field contains semicolon, quote, or newline, wrap in quotes and escape quotes
  if (strValue.includes(';') || strValue.includes('"') || strValue.includes('\n') || strValue.includes('\r')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  
  return strValue;
};

/**
 * Formats number for Portuguese locale (comma as decimal separator)
 */
const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Formats date for Portuguese locale (DD/MM/YYYY)
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const exportPayrollToCSV = (data: PayrollExportData, options: PayrollExportOptions): Blob => {
  const lines: string[] = [];
  
  // Cabeçalho
  lines.push(escapeCsvField(`Relatório Payroll - ${data.period.monthName}`));
  lines.push('');
  
  // Resumo dos totais
  lines.push(escapeCsvField('RESUMO MENSAL'));
  lines.push(`${escapeCsvField('Campo')};${escapeCsvField('Valor (€)')}`);
  lines.push(`${escapeCsvField('Salário Base')};${escapeCsvField(formatNumber(data.totals.base))}`);
  lines.push(`${escapeCsvField('Horas Extra - Dia')};${escapeCsvField(formatNumber(data.totals.overtimeDay))}`);
  lines.push(`${escapeCsvField('Horas Extra - Noite')};${escapeCsvField(formatNumber(data.totals.overtimeNight))}`);
  lines.push(`${escapeCsvField('Horas Extra - Fim de semana')};${escapeCsvField(formatNumber(data.totals.overtimeWeekend))}`);
  lines.push(`${escapeCsvField('Horas Extra - Feriado')};${escapeCsvField(formatNumber(data.totals.overtimeHoliday))}`);
  lines.push(`${escapeCsvField('Subsídio de Alimentação')};${escapeCsvField(formatNumber(data.totals.meal))}`);
  lines.push(`${escapeCsvField('Subsídio de Férias')};${escapeCsvField(formatNumber(data.totals.vacation))}`);
  lines.push(`${escapeCsvField('Subsídio de Natal')};${escapeCsvField(formatNumber(data.totals.christmas))}`);
  lines.push(`${escapeCsvField('Quilometragem')};${escapeCsvField(formatNumber(data.totals.mileage))}`);
  lines.push(`${escapeCsvField('Total Bruto')};${escapeCsvField(formatNumber(data.totals.gross))}`);
  lines.push(`${escapeCsvField('Total Líquido')};${escapeCsvField(formatNumber(data.totals.net))}`);
  lines.push('');
  
  // Horas trabalhadas (se incluído)
  if (options.includeHours && data.hours.length > 0) {
    lines.push(escapeCsvField('HORAS TRABALHADAS'));
    lines.push(`${escapeCsvField('Data')};${escapeCsvField('Início')};${escapeCsvField('Fim')};${escapeCsvField('Pausa (min)')};${escapeCsvField('Total Horas')};${escapeCsvField('Extra Dia')};${escapeCsvField('Extra Noite')};${escapeCsvField('Extra Fim Semana')};${escapeCsvField('Extra Feriado')};${escapeCsvField('Notas')}`);
    data.hours.forEach(hour => {
      const date = formatDate(hour.date);
      lines.push([
        escapeCsvField(date),
        escapeCsvField(hour.start_time),
        escapeCsvField(hour.end_time),
        escapeCsvField(hour.break_minutes.toString()),
        escapeCsvField(formatNumber(hour.total_hours)),
        escapeCsvField(formatNumber(hour.overtime_day)),
        escapeCsvField(formatNumber(hour.overtime_night)),
        escapeCsvField(formatNumber(hour.overtime_weekend)),
        escapeCsvField(formatNumber(hour.overtime_holiday)),
        escapeCsvField(hour.notes || '')
      ].join(';'));
    });
    lines.push('');
  }
  
  // Quilometragem (se incluído)
  if (options.includeMileage && data.mileage.length > 0) {
    lines.push(escapeCsvField('QUILOMETRAGEM'));
    lines.push(`${escapeCsvField('Data')};${escapeCsvField('Quilómetros')};${escapeCsvField('Origem')};${escapeCsvField('Destino')};${escapeCsvField('Motivo')};${escapeCsvField('Valor (€)')}`);
    data.mileage.forEach(trip => {
      const date = formatDate(trip.date);
      lines.push([
        escapeCsvField(date),
        escapeCsvField(formatNumber(trip.kilometers, 1)),
        escapeCsvField(trip.origin),
        escapeCsvField(trip.destination),
        escapeCsvField(trip.purpose),
        escapeCsvField(formatNumber(trip.amount))
      ].join(';'));
    });
    lines.push('');
  }
  
  const csvContent = lines.join('\n');
  
  // Add BOM for UTF-8 to ensure proper encoding in Excel
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  return new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
};

/**
 * Exporta dados do payroll para PDF
 */
export const exportPayrollToPDF = async (data: PayrollExportData, options: PayrollExportOptions): Promise<Blob> => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  
  const doc = new jsPDF();
  let yPosition = 20;
  
  // Título
  doc.setFontSize(20);
  doc.text(`Relatório Payroll - ${data.period.monthName}`, 105, yPosition, { align: 'center' });
  yPosition += 20;
  
  // Resumo dos totais
  doc.setFontSize(14);
  doc.text('Resumo Mensal', 20, yPosition);
  yPosition += 10;
  
  const summaryData = [
    ['Salário Base', `${formatNumber(data.totals.base)} €`],
    ['Horas Extra - Dia', `${formatNumber(data.totals.overtimeDay)} €`],
    ['Horas Extra - Noite', `${formatNumber(data.totals.overtimeNight)} €`],
    ['Horas Extra - Fim de semana', `${formatNumber(data.totals.overtimeWeekend)} €`],
    ['Horas Extra - Feriado', `${formatNumber(data.totals.overtimeHoliday)} €`],
    ['Subsídio de Alimentação', `${formatNumber(data.totals.meal)} €`],
    ['Subsídio de Férias', `${formatNumber(data.totals.vacation)} €`],
    ['Subsídio de Natal', `${formatNumber(data.totals.christmas)} €`],
    ['Quilometragem', `${formatNumber(data.totals.mileage)} €`],
    ['Total Bruto', `${formatNumber(data.totals.gross)} €`],
    ['Total Líquido', `${formatNumber(data.totals.net)} €`]
  ];
  
  (autoTable as any)(doc, {
    head: [['Campo', 'Valor']],
    body: summaryData,
    startY: yPosition,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 20;
  
  // Horas trabalhadas (se incluído)
  if (options.includeHours && data.hours.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Horas Trabalhadas', 20, yPosition);
    yPosition += 10;
    
    const hoursData = data.hours.map(hour => [
      formatDate(hour.date),
      hour.start_time,
      hour.end_time,
      hour.break_minutes.toString(),
      formatNumber(hour.total_hours),
      formatNumber(hour.overtime_day),
      hour.notes || ''
    ]);
    
    (autoTable as any)(doc, {
      head: [['Data', 'Início', 'Fim', 'Pausa', 'Total', 'Extra', 'Notas']],
      body: hoursData,
      startY: yPosition,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 20;
  }
  
  // Quilometragem (se incluído)
  if (options.includeMileage && data.mileage.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.text('Quilometragem', 20, yPosition);
    yPosition += 10;
    
    const mileageData = data.mileage.map(trip => [
      formatDate(trip.date),
      formatNumber(trip.kilometers, 1),
      trip.origin,
      trip.destination,
      trip.purpose,
      `${formatNumber(trip.amount)} €`
    ]);
    
    (autoTable as any)(doc, {
      head: [['Data', 'KM', 'Origem', 'Destino', 'Motivo', 'Valor']],
      body: mileageData,
      startY: yPosition,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
  }
  
  return new Blob([doc.output('blob')], { type: 'application/pdf' });
};

/**
 * Clamps the date range to the civil month boundaries based on the start date
 */
const clampToMonthBoundaries = (dateRange: { start: string; end: string }) => {
  const startDate = new Date(dateRange.start);
  const year = startDate.getFullYear();
  const month = startDate.getMonth();
  
  // First day of the month
  const monthStart = new Date(year, month, 1);
  // Last day of the month
  const monthEnd = new Date(year, month + 1, 0);
  
  const requestedStart = new Date(dateRange.start);
  const requestedEnd = new Date(dateRange.end);
  
  // Clamp to month boundaries
  const clampedStart = requestedStart < monthStart ? monthStart : requestedStart;
  const clampedEnd = requestedEnd > monthEnd ? monthEnd : requestedEnd;
  
  return {
    start: clampedStart.toISOString().split('T')[0],
    end: clampedEnd.toISOString().split('T')[0],
    year,
    month: month + 1
  };
};

/**
 * Builds filename based on export options
 */
const buildFilename = (
  year: number,
  month: number,
  format: string,
  options: PayrollExportOptions
): string => {
  const monthStr = month.toString().padStart(2, '0');
  let filename = `payroll-${year}-${monthStr}`;
  
  if (options.includeHours) filename += '-horas';
  if (options.includeMileage) filename += '-km';
  if (options.includeConfig) filename += '-config';
  
  return `${filename}.${format}`;
};

/**
 * Função principal de exportação do payroll
 */
export const exportPayrollReport = async (
  userId: string,
  options: PayrollExportOptions
): Promise<{ blob: Blob; filename: string }> => {
  try {
    // Clamp date range to civil month boundaries
    const { start, end, year, month } = clampToMonthBoundaries(options.dateRange);
    
    // Update options with clamped date range
    const clampedOptions = {
      ...options,
      dateRange: { start, end }
    };
    
    const data = await fetchPayrollExportData(userId, year, month);
    
    let blob: Blob;
    let extension: string;
    
    switch (options.format) {
      case 'csv':
        blob = exportPayrollToCSV(data, clampedOptions);
        extension = 'csv';
        break;
      case 'pdf':
        blob = await exportPayrollToPDF(data, clampedOptions);
        extension = 'pdf';
        break;
      default:
        throw new Error(`Formato não suportado: ${options.format}`);
    }
    
    const filename = buildFilename(year, month, extension, options);
    
    return { blob, filename };
  } catch (error) {
    console.error('Error exporting payroll report:', error);
    throw new Error('Erro ao exportar relatório do payroll');
  }
};

/**
 * Função utilitária para download de arquivo
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};