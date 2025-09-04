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
          create: {
            title: 'Criar Contrato',
            description: 'Crie um novo contrato para começar a configurar a sua folha de pagamento.',
            newContract: 'Novo Contrato',
            createFirst: 'Criar Primeiro Contrato',
        noContracts: 'Nenhum contrato encontrado. Crie o seu primeiro contrato para começar.',
        successMessage: 'Contrato "{{name}}" criado com sucesso!',
            nameLabel: 'Nome do Contrato',
            namePlaceholder: 'Ex: Contrato Principal 2024',
            nameRequired: 'O nome do contrato é obrigatório',
            nameMaxLength: 'O nome não pode exceder {{max}} caracteres',
            nameDuplicate: 'Já existe um contrato com este nome',
            nameOnlySpaces: 'O nome não pode conter apenas espaços',
            characterCount: '{{current}}/{{max}} caracteres',
            creating: 'A criar...',
            create: 'Criar Contrato',
            cancel: 'Cancelar',
            success: 'Contrato criado com sucesso',
            error: 'Erro ao criar contrato',
            errorDescription: 'Ocorreu um erro ao criar o contrato. Tente novamente.',
          },
        },
        timesheet: {
          blockedDays: {
            notice_one: '{{count}} dia está bloqueado para edição de horas',
            notice_other: '{{count}} dias estão bloqueados para edição de horas',
            aria_one: 'Limpou horas de {{count}} dia bloqueado (feriado, férias ou doente)',
            aria_other: 'Limpou horas de {{count}} dias bloqueados (feriados, férias ou doente)',
          },
          holiday: {
            tooltip: 'Feriado - predefinido pelo sistema, desative via contrato se necessário',
            disabled: 'Checkbox de feriado é apenas informativo. Para alterar, configure no contrato.',
            ariaLabel: 'Dia marcado como feriado (apenas leitura)',
          },
          exception: {
            tooltip: 'Permite editar horas mesmo em feriados, férias ou doença',
            ariaLabel: 'Marcar como exceção ao horário normal',
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
      timesheet: {
        nav: {
          prev_with_shortcut: 'Semana anterior (Alt+←)',
          next_with_shortcut: 'Semana seguinte (Alt+→)',
        },
        week_short: 'Sem. {{num}}',
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
          create: {
            title: 'Create Contract',
            description: 'Create a new contract to start configuring your payroll.',
            newContract: 'New Contract',
            createFirst: 'Create First Contract',
            noContracts: 'No contracts found. Create your first contract to get started.',
            successMessage: 'Contract "{{name}}" created successfully!',
            nameLabel: 'Contract Name',
            namePlaceholder: 'e.g., Main Contract 2024',
            nameRequired: 'Contract name is required',
            nameMaxLength: 'Name cannot exceed {{max}} characters',
            nameDuplicate: 'A contract with this name already exists',
            nameOnlySpaces: 'Name cannot contain only spaces',
            characterCount: '{{current}}/{{max}} characters',
            creating: 'Creating...',
            create: 'Create Contract',
            cancel: 'Cancel',
            success: 'Contract created successfully',
            error: 'Error creating contract',
            errorDescription: 'An error occurred while creating the contract. Please try again.',
          },
        },
        timesheet: {
          blockedDays: {
            notice_one: '{{count}} day is blocked for time editing',
            notice_other: '{{count}} days are blocked for time editing',
            aria_one: 'Cleared hours from {{count}} blocked day (holiday, vacation or sick)',
            aria_other: 'Cleared hours from {{count}} blocked days (holidays, vacation or sick)',
          },
          holiday: {
            tooltip: 'Holiday - system predefined, disable via contract if needed',
            disabled: 'Holiday checkbox is informational only. To change, configure in contract.',
            ariaLabel: 'Day marked as holiday (read-only)',
          },
          exception: {
            tooltip: 'Allows editing hours even on holidays, vacation or sick days',
            ariaLabel: 'Mark as exception to normal schedule',
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
      timesheet: {
        nav: {
          prev_with_shortcut: 'Previous week (Alt+←)',
          next_with_shortcut: 'Next week (Alt+→)',
        },
        week_short: 'W{{num}}',
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