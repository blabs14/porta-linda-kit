// Tipos para o sistema de calendário de fluxos e previsões

export type CashflowEventType = 
  | 'recurring_income'
  | 'recurring_expense'
  | 'subscription'
  | 'goal_funding'
  | 'credit_card_due'
  | 'scheduled_transaction';

export type CashflowScope = 'personal' | 'family';

export interface CashflowEvent {
  id: string;
  type: CashflowEventType;
  scope: CashflowScope;
  date: string; // ISO date string
  amount_cents: number;
  currency: string;
  description: string;
  category_id?: string;
  account_id?: string;
  source_id: string; // ID da regra/objetivo/cartão que gerou o evento
  source_type: string; // 'recurring_rule' | 'goal_funding_rule' | 'credit_card' | etc
  is_income: boolean;
  metadata?: {
    payee?: string;
    vendor?: string;
    goal_name?: string;
    card_name?: string;
    rule_description?: string;
    [key: string]: any;
  };
}

export interface DailyCashflowSummary {
  date: string; // ISO date string
  total_income_cents: number;
  total_expense_cents: number;
  net_flow_cents: number;
  running_balance_cents: number; // saldo atual + somatório até este dia
  events: CashflowEvent[];
  currency: string;
}

export interface CashflowPeriod {
  start_date: string;
  end_date: string;
  daily_summaries: DailyCashflowSummary[];
  total_income_cents: number;
  total_expense_cents: number;
  net_flow_cents: number;
  starting_balance_cents: number;
  ending_balance_cents: number;
  currency: string;
}

export interface CashflowFilters {
  scope?: CashflowScope;
  account_ids?: string[];
  account_id?: string; // Campo usado pelo componente CashflowView
  event_types?: CashflowEventType[];
  category_ids?: string[];
  include_income?: boolean;
  include_expenses?: boolean;
  days_ahead?: number; // Campo usado pelo componente CashflowView
}

export interface CashflowExportOptions {
  format: 'csv' | 'ics';
  include_metadata?: boolean;
  date_format?: 'iso' | 'local';
}

// Tipos para as fontes de dados
export interface RecurringRuleSource {
  id: string;
  scope: CashflowScope;
  payee?: string;
  description: string;
  category_id?: string;
  amount_cents: number;
  currency: string;
  interval_unit: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
  start_date: string;
  end_date?: string;
  next_run_date: string;
  status: 'active' | 'paused' | 'canceled';
  is_subscription: boolean;
  vendor?: string;
  payment_method?: string;
}

export interface GoalFundingSource {
  id: string;
  goal_id: string;
  goal_name: string;
  type: 'fixed_monthly';
  enabled: boolean;
  fixed_cents: number;
  day_of_month: number;
  currency: string;
  scope: CashflowScope;
}

export interface CreditCardSource {
  id: string;
  account_id: string;
  account_name: string;
  current_balance_cents: number;
  currency: string;
  scope: CashflowScope;
  // Assumindo que não temos ainda campos específicos de fechamento/fatura
  // Estes podem ser adicionados quando implementados
  due_day?: number;
  statement_day?: number;
}

export interface ScheduledTransactionSource {
  id: string;
  account_id: string;
  category_id: string;
  amount_cents: number;
  description: string;
  scheduled_date: string;
  currency: string;
  scope: CashflowScope;
  is_income: boolean;
}

// Tipos para agregação de contas
export interface AccountBalance {
  account_id: string;
  account_name: string;
  account_type: string;
  current_balance_cents: number;
  currency: string;
  scope: CashflowScope;
}

export interface CashflowProjection {
  current_balances: AccountBalance[];
  period: CashflowPeriod;
  filters: CashflowFilters;
  generated_at: string;
}