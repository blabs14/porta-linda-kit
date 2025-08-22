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
    // Calcular totais do payroll
    const payrollResult = await calculatePayroll(userId, year, month);
    
    // Buscar horas trabalhadas
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const hoursData = await payrollService.getHours(userId, startDate, endDate);
    
    // Buscar viagens de quilometragem
    const mileageData = await payrollService.getMileageTrips(userId, startDate, endDate);
    
    // Buscar configurações
    const [contractData, overtimePolicyData, mealAllowanceData, mileagePolicyData] = await Promise.all([
      payrollService.getActiveContract(userId),
      payrollService.getActiveOTPolicy(userId),
      payrollService.getMealAllowanceConfig(userId),
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
export const exportPayrollToCSV = (data: PayrollExportData, options: PayrollExportOptions): Blob => {
  const lines: string[] = [];
  
  // Cabeçalho
  lines.push(`Relatório Payroll - ${data.period.monthName}`);
  lines.push('');
  
  // Resumo dos totais
  lines.push('RESUMO MENSAL');
  lines.push('Campo,Valor (€)');
  lines.push(`Salário Base,${data.totals.base.toFixed(2)}`);
  lines.push(`Horas Extra - Dia,${data.totals.overtimeDay.toFixed(2)}`);
  lines.push(`Horas Extra - Noite,${data.totals.overtimeNight.toFixed(2)}`);
  lines.push(`Horas Extra - Fim de semana,${data.totals.overtimeWeekend.toFixed(2)}`);
  lines.push(`Horas Extra - Feriado,${data.totals.overtimeHoliday.toFixed(2)}`);
  lines.push(`Subsídio de Alimentação,${data.totals.meal.toFixed(2)}`);
  lines.push(`Subsídio de Férias,${data.totals.vacation.toFixed(2)}`);
  lines.push(`Subsídio de Natal,${data.totals.christmas.toFixed(2)}`);
  lines.push(`Quilometragem,${data.totals.mileage.toFixed(2)}`);
  lines.push(`Total Bruto,${data.totals.gross.toFixed(2)}`);
  lines.push(`Total Líquido,${data.totals.net.toFixed(2)}`);
  lines.push('');
  
  // Horas trabalhadas (se incluído)
  if (options.includeHours && data.hours.length > 0) {
    lines.push('HORAS TRABALHADAS');
    lines.push('Data,Início,Fim,Pausa (min),Total Horas,Extra Dia,Extra Noite,Extra Fim Semana,Extra Feriado,Notas');
    data.hours.forEach(hour => {
      const date = new Date(hour.date).toLocaleDateString('pt-PT');
      lines.push(`${date},${hour.start_time},${hour.end_time},${hour.break_minutes},${hour.total_hours.toFixed(2)},${hour.overtime_day.toFixed(2)},${hour.overtime_night.toFixed(2)},${hour.overtime_weekend.toFixed(2)},${hour.overtime_holiday.toFixed(2)},"${hour.notes || ''}"`);;
    });
    lines.push('');
  }
  
  // Quilometragem (se incluído)
  if (options.includeMileage && data.mileage.length > 0) {
    lines.push('QUILOMETRAGEM');
    lines.push('Data,Quilómetros,Origem,Destino,Motivo,Valor (€)');
    data.mileage.forEach(trip => {
      const date = new Date(trip.date).toLocaleDateString('pt-PT');
      lines.push(`${date},${trip.kilometers},"${trip.origin}","${trip.destination}","${trip.purpose}",${trip.amount.toFixed(2)}`);
    });
    lines.push('');
  }
  
  const csvContent = lines.join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
    ['Salário Base', `${data.totals.base.toFixed(2)} €`],
    ['Horas Extra - Dia', `${data.totals.overtimeDay.toFixed(2)} €`],
    ['Horas Extra - Noite', `${data.totals.overtimeNight.toFixed(2)} €`],
    ['Horas Extra - Fim de semana', `${data.totals.overtimeWeekend.toFixed(2)} €`],
    ['Horas Extra - Feriado', `${data.totals.overtimeHoliday.toFixed(2)} €`],
    ['Subsídio de Alimentação', `${data.totals.meal.toFixed(2)} €`],
    ['Subsídio de Férias', `${data.totals.vacation.toFixed(2)} €`],
    ['Subsídio de Natal', `${data.totals.christmas.toFixed(2)} €`],
    ['Quilometragem', `${data.totals.mileage.toFixed(2)} €`],
    ['Total Bruto', `${data.totals.gross.toFixed(2)} €`],
    ['Total Líquido', `${data.totals.net.toFixed(2)} €`]
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
      new Date(hour.date).toLocaleDateString('pt-PT'),
      hour.start_time,
      hour.end_time,
      hour.break_minutes.toString(),
      hour.total_hours.toFixed(2),
      hour.overtime_day.toFixed(2),
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
      new Date(trip.date).toLocaleDateString('pt-PT'),
      trip.kilometers.toString(),
      trip.origin,
      trip.destination,
      trip.purpose,
      `${trip.amount.toFixed(2)} €`
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
 * Função principal de exportação do payroll
 */
export const exportPayrollReport = async (
  userId: string,
  options: PayrollExportOptions
): Promise<{ blob: Blob; filename: string }> => {
  try {
    const startDate = new Date(options.dateRange.start);
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    
    const data = await fetchPayrollExportData(userId, year, month);
    
    let blob: Blob;
    let extension: string;
    
    switch (options.format) {
      case 'csv':
        blob = exportPayrollToCSV(data, options);
        extension = 'csv';
        break;
      case 'pdf':
        blob = await exportPayrollToPDF(data, options);
        extension = 'pdf';
        break;
      default:
        throw new Error(`Formato não suportado: ${options.format}`);
    }
    
    const filename = `payroll-${data.period.monthName.replace(' ', '-')}.${extension}`;
    
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