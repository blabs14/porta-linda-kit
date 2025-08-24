import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  'pt-PT': {
    translation: {
      settings: {
        title: 'Definições',
        personal: 'Pessoais',
        language: 'Idioma',
        currency: 'Moeda',
        save: 'Guardar',
        cancel: 'Cancelar',
      },
      payroll: {
        contract: {
          selector: {
            label: 'Contrato Ativo',
            placeholder: 'Selecionar contrato',
            noContracts: 'Nenhum contrato disponível',
            inactive: 'Inativo',
            active: 'Ativo',
            switchedTo: 'Mudou para o contrato: {{name}}',
          },
        },
        export: {
          includeHours: 'Incluir horas trabalhadas',
          includeMileage: 'Incluir quilometragem',
          includeConfig: 'Incluir configuração',
          includeInReports: 'Incluir nos relatórios',
        },
      },
      reports: {
        exportReport: 'Exportar Relatório',
        format: 'Formato',
        selectFormat: 'Selecionar formato',
        period: 'Período',
        thisMonth: 'Este mês',
        lastMonth: 'Mês anterior',
        last3Months: 'Últimos 3 meses',
        thisYear: 'Este ano',
        dateRange: 'Intervalo de datas',
        quickRanges: 'Intervalos rápidos',
        last30Days: 'Últimos 30 dias',
        last90Days: 'Últimos 90 dias',
        startDate: 'Data início',
        endDate: 'Data fim',
        additionalOptions: 'Opções adicionais de exportação',
        export: 'Exportar',
        exporting: 'A exportar...',
        exported: 'Relatório exportado',
        exportSuccess: 'O relatório foi exportado com sucesso em formato {{format}}',
        exportError: 'Erro ao exportar',
        exportErrorDescription: 'Ocorreu um erro ao exportar o relatório',
      },
    },
  },
  'en-US': {
    translation: {
      settings: {
        title: 'Settings',
        personal: 'Personal',
        language: 'Language',
        currency: 'Currency',
        save: 'Save',
        cancel: 'Cancel',
      },
      payroll: {
        contract: {
          selector: {
            label: 'Active Contract',
            placeholder: 'Select contract',
            noContracts: 'No contracts available',
            inactive: 'Inactive',
            active: 'Active',
            switchedTo: 'Switched to contract: {{name}}',
          },
        },
        export: {
          includeHours: 'Include worked hours',
          includeMileage: 'Include mileage',
          includeConfig: 'Include configuration',
          includeInReports: 'Include in reports',
        },
      },
      reports: {
        exportReport: 'Export Report',
        format: 'Format',
        selectFormat: 'Select format',
        period: 'Period',
        thisMonth: 'This month',
        lastMonth: 'Last month',
        last3Months: 'Last 3 months',
        thisYear: 'This year',
        dateRange: 'Date range',
        quickRanges: 'Quick ranges',
        last30Days: 'Last 30 days',
        last90Days: 'Last 90 days',
        startDate: 'Start date',
        endDate: 'End date',
        additionalOptions: 'Additional export options',
        export: 'Export',
        exporting: 'Exporting...',
        exported: 'Report exported',
        exportSuccess: 'Report was successfully exported in {{format}} format',
        exportError: 'Export error',
        exportErrorDescription: 'An error occurred while exporting the report',
      },
    },
  },
};

let initialized = false;

export function initI18n(language: string) {
  if (initialized) return;
  i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'pt-PT',
    interpolation: { escapeValue: false },
  });
  initialized = true;
}

export function changeLanguage(language: string) {
  if (!initialized) {
    initI18n(language);
  }
  i18n.changeLanguage(language);
}

export default i18n;