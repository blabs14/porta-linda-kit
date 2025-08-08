export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null
          family_id: string | null
          id: string
          nome: string
          saldo: number | null
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          family_id?: string | null
          id?: string
          nome: string
          saldo?: number | null
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          family_id?: string | null
          id?: string
          nome?: string
          saldo?: number | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          details: Json | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string | null
          table_name: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id?: string | null
          table_name: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string | null
          table_name?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          categoria_id: string
          created_at: string | null
          family_id: string | null
          id: string
          mes: string
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id: string
          created_at?: string | null
          family_id?: string | null
          id?: string
          mes: string
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          categoria_id?: string
          created_at?: string | null
          family_id?: string | null
          id?: string
          mes?: string
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          cor: string | null
          created_at: string | null
          family_id: string | null
          id: string
          nome: string
          user_id: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          nome: string
          user_id?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          nome?: string
          user_id?: string | null
        }
        Relationships: []
      }
      debug_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          operation: string
          result: boolean
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          operation: string
          result: boolean
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          operation?: string
          result?: boolean
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          nome: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          nome: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          nome?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      family_backups: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string
          error_message: string | null
          expires_at: string | null
          family_id: string
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          status: string
        }
        Insert: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          error_message?: string | null
          expires_at?: string | null
          family_id: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          status?: string
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          error_message?: string | null
          expires_at?: string | null
          family_id?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_backups_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          family_id: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          family_id: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          joined_at: string | null
          permissions: string[] | null
          role: string
          user_id: string
        }
        Insert: {
          family_id: string
          id?: string
          joined_at?: string | null
          permissions?: string[] | null
          role?: string
          user_id: string
        }
        Update: {
          family_id?: string
          id?: string
          joined_at?: string | null
          permissions?: string[] | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_family_members_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      fixed_expenses: {
        Row: {
          ativa: boolean | null
          categoria_id: string
          created_at: string | null
          dia_vencimento: number
          id: string
          nome: string
          user_id: string
          valor: number
        }
        Insert: {
          ativa?: boolean | null
          categoria_id: string
          created_at?: string | null
          dia_vencimento: number
          id?: string
          nome: string
          user_id: string
          valor: number
        }
        Update: {
          ativa?: boolean | null
          categoria_id?: string
          created_at?: string | null
          dia_vencimento?: number
          id?: string
          nome?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expenses_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_allocations: {
        Row: {
          account_id: string
          created_at: string | null
          data_alocacao: string
          descricao: string | null
          goal_id: string
          id: string
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          account_id: string
          created_at?: string | null
          data_alocacao?: string
          descricao?: string | null
          goal_id: string
          id?: string
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          account_id?: string
          created_at?: string | null
          data_alocacao?: string
          descricao?: string | null
          goal_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_allocations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "goal_allocations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances_v1"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "goal_allocations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances_with_reserved"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "goal_allocations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_reserved"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "goal_allocations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_allocations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_progress"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "goal_allocations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          account_id: string | null
          ativa: boolean | null
          created_at: string | null
          family_id: string | null
          id: string
          nome: string
          prazo: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          valor_atual: number | null
          valor_meta: number | null
          valor_objetivo: number
        }
        Insert: {
          account_id?: string | null
          ativa?: boolean | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          nome: string
          prazo?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          valor_atual?: number | null
          valor_meta?: number | null
          valor_objetivo?: number
        }
        Update: {
          account_id?: string | null
          ativa?: boolean | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          nome?: string
          prazo?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          valor_atual?: number | null
          valor_meta?: number | null
          valor_objetivo?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances_v1"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances_with_reserved"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_reserved"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string | null
          family_id: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          first_name: string | null
          foto_url: string | null
          id: string
          last_name: string | null
          nome: string
          percentual_divisao: number | null
          personal_settings: Json | null
          phone: string | null
          poupanca_mensal: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          first_name?: string | null
          foto_url?: string | null
          id?: string
          last_name?: string | null
          nome: string
          percentual_divisao?: number | null
          personal_settings?: Json | null
          phone?: string | null
          poupanca_mensal?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          first_name?: string | null
          foto_url?: string | null
          id?: string
          last_name?: string | null
          nome?: string
          percentual_divisao?: number | null
          personal_settings?: Json | null
          phone?: string | null
          poupanca_mensal?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          id: string
          layout: Json
          name: string
          styling: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          layout?: Json
          name: string
          styling?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          layout?: Json
          name?: string
          styling?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_exports: {
        Row: {
          active: boolean | null
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          email: string
          id: string
          last_run: string | null
          name: string
          next_run: string | null
          options: Json
          schedule: string
          time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          email: string
          id?: string
          last_run?: string | null
          name: string
          next_run?: string | null
          options: Json
          schedule: string
          time: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          email?: string
          id?: string
          last_run?: string | null
          name?: string
          next_run?: string | null
          options?: Json
          schedule?: string
          time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          categoria_id: string
          created_at: string | null
          data: string
          descricao: string | null
          family_id: string | null
          goal_id: string | null
          id: string
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          account_id: string
          categoria_id: string
          created_at?: string | null
          data: string
          descricao?: string | null
          family_id?: string | null
          goal_id?: string | null
          id?: string
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          account_id?: string
          categoria_id?: string
          created_at?: string | null
          data?: string
          descricao?: string | null
          family_id?: string | null
          goal_id?: string | null
          id?: string
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances_v1"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances_with_reserved"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_reserved"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_progress"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string | null
          family_id: string | null
          saldo_atual: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      account_balances_v1: {
        Row: {
          account_id: string | null
          disponivel: number | null
          family_id: string | null
          is_in_debt: boolean | null
          nome: string | null
          reservado: number | null
          reservado_final: number | null
          saldo_atual: number | null
          tipo: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      account_balances_with_reserved: {
        Row: {
          account_id: string | null
          created_at: string | null
          family_id: string | null
          nome: string | null
          saldo_atual: number | null
          saldo_disponivel: number | null
          tipo: string | null
          total_reservado: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      account_reserved: {
        Row: {
          account_id: string | null
          total_reservado: number | null
        }
        Relationships: []
      }
      budget_progress: {
        Row: {
          budget_id: string | null
          categoria_cor: string | null
          categoria_id: string | null
          categoria_nome: string | null
          mes: string | null
          progresso_percentual: number | null
          user_id: string | null
          valor_gasto: number | null
          valor_orcamento: number | null
          valor_restante: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members_with_profile: {
        Row: {
          family_id: string | null
          id: string | null
          joined_at: string | null
          permissions: string[] | null
          profile_nome: string | null
          role: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_family_members_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      goal_progress: {
        Row: {
          goal_id: string | null
          nome: string | null
          progresso_percentual: number | null
          total_alocado: number | null
          valor_objetivo: number | null
        }
        Relationships: []
      }
      transactions_detailed: {
        Row: {
          account_id: string | null
          account_nome: string | null
          account_tipo: string | null
          categoria_cor: string | null
          categoria_nome: string | null
          created_at: string | null
          data: string | null
          descricao: string | null
          family_id: string | null
          family_nome: string | null
          goal_id: string | null
          goal_nome: string | null
          id: string | null
          tipo: string | null
          user_id: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances_v1"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances_with_reserved"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_reserved"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_progress"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_family_invite: {
        Args: { invite_token: string }
        Returns: Json
      }
      accept_family_invite_by_email: {
        Args: { p_invite_id: string }
        Returns: Json
      }
      allocate_to_goal_with_transaction: {
        Args: {
          goal_id_param: string
          account_id_param: string
          amount_param: number
          user_id_param: string
          description_param?: string
        }
        Returns: Json
      }
      cancel_family_invite: {
        Args: { p_invite_id: string }
        Returns: Json
      }
      cleanup_all_old_transfer_transactions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_expired_backups: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_transfer_transactions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_unused_indexes: {
        Args: Record<PropertyKey, never>
        Returns: {
          index_name: string
          table_name: string
          index_size: string
          last_scan_days: number
        }[]
      }
      create_family_backup: {
        Args: { p_family_id: string; p_backup_type?: string; p_metadata?: Json }
        Returns: Json
      }
      create_family_direct: {
        Args: { p_family_name: string; p_user_id: string }
        Returns: string
      }
      create_family_notification: {
        Args: {
          p_family_id: string
          p_user_id: string
          p_title: string
          p_message: string
          p_type?: string
          p_category?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      create_family_with_member: {
        Args:
          | { p_family_name: string; p_description: string; p_user_id: string }
          | { p_family_name: string; p_description?: string }
          | { p_family_name: string; p_user_id: string; p_description?: string }
        Returns: Json
      }
      create_transfer_transaction: {
        Args: {
          p_from_account_id: string
          p_to_account_id: string
          p_amount: number
          p_user_id: string
          p_categoria_id: string
          p_description?: string
          p_data?: string
        }
        Returns: Json
      }
      delete_account_with_related_data: {
        Args: { p_account_id: string; p_user_id: string }
        Returns: Json
      }
      delete_family_with_cascade: {
        Args: { p_family_id: string }
        Returns: Json
      }
      delete_goal_with_restoration: {
        Args: { goal_id_param: string; user_id_param: string }
        Returns: Json
      }
      get_accounts_with_balances: {
        Args: { p_scope?: string; p_family_id?: string }
        Returns: {
          account_id: string
          nome: string
          tipo: string
          family_id: string
          user_id: string
          saldo_atual: number
          reservado: number
          disponivel: number
          is_in_debt: boolean
        }[]
      }
      get_credit_card_summary: {
        Args: { p_user_id: string; p_account_id: string }
        Returns: Json
      }
      get_family_accounts_with_balances: {
        Args: { p_user_id?: string }
        Returns: {
          id: string
          user_id: string
          family_id: string
          nome: string
          tipo: string
          saldo: number
          saldo_atual: number
          total_reservado: number
          saldo_disponivel: number
          created_at: string
        }[]
      }
      get_family_backup_stats: {
        Args: { p_family_id: string }
        Returns: Json
      }
      get_family_budgets: {
        Args: { p_user_id?: string }
        Returns: {
          id: string
          categoria_id: string
          valor: number
          mes: string
          user_id: string
          family_id: string
          created_at: string
          updated_at: string
        }[]
      }
      get_family_data_by_id: {
        Args: { p_family_id: string }
        Returns: Json
      }
      get_family_goals: {
        Args: { p_user_id?: string }
        Returns: {
          id: string
          nome: string
          valor_objetivo: number
          valor_atual: number
          prazo: string
          ativa: boolean
          user_id: string
          family_id: string
          created_at: string
          updated_at: string
        }[]
      }
      get_family_kpis: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_balance: number
          credit_card_debt: number
          top_goal_progress: number
          monthly_savings: number
          goals_account_balance: number
          total_goals_value: number
          goals_progress_percentage: number
          total_budget_spent: number
          total_budget_amount: number
          budget_spent_percentage: number
          total_members: number
          pending_invites: number
        }[]
      }
      get_family_kpis_with_user: {
        Args: { p_user_id: string }
        Returns: {
          total_balance: number
          credit_card_debt: number
          top_goal_progress: number
          monthly_savings: number
          goals_account_balance: number
          total_goals_value: number
          goals_progress_percentage: number
          total_budget_spent: number
          total_budget_amount: number
          budget_spent_percentage: number
          total_members: number
          pending_invites: number
        }[]
      }
      get_family_members_simple: {
        Args: { p_family_id: string }
        Returns: Json
      }
      get_family_members_test: {
        Args: { p_family_id: string }
        Returns: Json
      }
      get_family_members_with_profiles: {
        Args: { p_family_id: string }
        Returns: Json
      }
      get_family_pending_invites: {
        Args: { p_family_id: string }
        Returns: Json
      }
      get_family_statistics: {
        Args: { p_family_id: string }
        Returns: Json
      }
      get_family_transactions: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          valor: number
          data: string
          categoria_id: string
          tipo: string
          descricao: string
          created_at: string
          family_id: string
          account_id: string
          goal_id: string
        }[]
      }
      get_index_usage_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          index_name: string
          table_name: string
          index_size: string
          index_scans: number
          index_tuples_read: number
          index_tuples_fetched: number
        }[]
      }
      get_personal_accounts_with_balances: {
        Args: { p_user_id?: string }
        Returns: {
          id: string
          user_id: string
          family_id: string
          nome: string
          tipo: string
          saldo: number
          saldo_atual: number
          total_reservado: number
          saldo_disponivel: number
          created_at: string
        }[]
      }
      get_personal_budgets: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          categoria_id: string
          categoria_nome: string
          categoria_cor: string
          mes: string
          valor_orcamento: number
          valor_gasto: number
          valor_restante: number
          progresso_percentual: number
        }[]
      }
      get_personal_goals: {
        Args: { p_user_id?: string }
        Returns: {
          id: string
          nome: string
          valor_objetivo: number
          valor_atual: number
          prazo: string
          ativa: boolean
          user_id: string
          created_at: string
          updated_at: string
        }[]
      }
      get_personal_kpis: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_balance: number
          credit_card_debt: number
          top_goal_progress: number
          monthly_savings: number
          goals_account_balance: number
          total_goals_value: number
          goals_progress_percentage: number
          total_budget_spent: number
          total_budget_amount: number
          budget_spent_percentage: number
        }[]
      }
      get_personal_kpis_debug: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_balance: number
          credit_card_debt: number
          top_goal_progress: number
          monthly_savings: number
          goals_account_balance: number
          total_goals_value: number
          goals_progress_percentage: number
          total_budget_spent: number
          total_budget_amount: number
          budget_spent_percentage: number
        }[]
      }
      get_personal_kpis_test: {
        Args: { p_user_id: string }
        Returns: {
          total_balance: number
          credit_card_debt: number
          top_goal_progress: number
          monthly_savings: number
          goals_account_balance: number
          total_goals_value: number
          goals_progress_percentage: number
          total_budget_spent: number
          total_budget_amount: number
          budget_spent_percentage: number
        }[]
      }
      get_personal_kpis_test_fixed: {
        Args: { p_user_id: string }
        Returns: {
          total_balance: number
          credit_card_debt: number
          top_goal_progress: number
          monthly_savings: number
          goals_account_balance: number
          total_goals_value: number
          goals_progress_percentage: number
          total_budget_spent: number
          total_budget_amount: number
          budget_spent_percentage: number
        }[]
      }
      get_personal_kpis_with_user: {
        Args: { p_user_id: string }
        Returns: {
          total_balance: number
          credit_card_debt: number
          top_goal_progress: number
          monthly_savings: number
          goals_account_balance: number
          total_goals_value: number
          goals_progress_percentage: number
          total_budget_spent: number
          total_budget_amount: number
          budget_spent_percentage: number
        }[]
      }
      get_personal_transactions: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          valor: number
          data: string
          categoria_id: string
          tipo: string
          descricao: string
          created_at: string
          family_id: string
          account_id: string
          goal_id: string
        }[]
      }
      get_personal_transactions_fast: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          valor: number
          data: string
          categoria_id: string
          tipo: string
          descricao: string
          created_at: string
          family_id: string
          account_id: string
          goal_id: string
        }[]
      }
      get_user_account_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_id: string
          nome: string
          user_id: string
          saldo_atual: number
        }[]
      }
      get_user_account_reserved: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_id: string
          total_reservado: number
        }[]
      }
      get_user_accounts_with_balances: {
        Args: Record<PropertyKey, never> | { p_user_id?: string }
        Returns: {
          account_id: string
          nome: string
          user_id: string
          tipo: string
          saldo_atual: number
          total_reservado: number
          saldo_disponivel: number
        }[]
      }
      get_user_all_transactions: {
        Args: Record<PropertyKey, never> | { p_user_id: string }
        Returns: {
          id: string
          valor: number
          tipo: string
          data: string
          descricao: string
          modo: string
          user_id: string
          family_id: string
          categoria_id: string
        }[]
      }
      get_user_budget_progress: {
        Args: Record<PropertyKey, never>
        Returns: {
          budget_id: string
          categoria_id: string
          categoria_nome: string
          categoria_cor: string
          valor_orcamento: number
          valor_gasto: number
          valor_restante: number
          progresso_percentual: number
          mes: string
        }[]
      }
      get_user_families: {
        Args: Record<PropertyKey, never> | { p_user_id: string }
        Returns: {
          family_id: string
        }[]
      }
      get_user_family_data: {
        Args: Record<PropertyKey, never> | { p_user_id: string }
        Returns: Json
      }
      get_user_financial_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_saldo_contas: number
          total_reservado_objetivos: number
          total_saldo_disponivel: number
          total_contas: number
        }[]
      }
      get_user_goal_progress: {
        Args: Record<PropertyKey, never>
        Returns: {
          goal_id: string
          nome: string
          valor_objetivo: number
          total_alocado: number
          progresso_percentual: number
        }[]
      }
      get_user_pending_family_invites: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_transactions_detailed: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_account_id?: string
          p_categoria_id?: string
          p_tipo?: string
          p_data_inicio?: string
          p_data_fim?: string
        }
        Returns: {
          id: string
          valor: number
          data: string
          tipo: string
          descricao: string
          created_at: string
          account_id: string
          account_nome: string
          account_tipo: string
          categoria_id: string
          categoria_nome: string
          categoria_cor: string
          goal_id: string
          goal_nome: string
          family_id: string
          family_nome: string
        }[]
      }
      handle_credit_card_account: {
        Args: { p_account_id: string; p_user_id: string; p_operation?: string }
        Returns: Json
      }
      handle_credit_card_transaction: {
        Args: {
          p_user_id: string
          p_account_id: string
          p_valor: number
          p_data: string
          p_categoria_id: string
          p_tipo: string
          p_descricao?: string
          p_goal_id?: string
        }
        Returns: Json
      }
      invite_family_member_by_email: {
        Args: { p_family_id: string; p_email: string; p_role?: string }
        Returns: Json
      }
      log_permission_check: {
        Args:
          | {
              p_operation: string
              p_table_name: string
              p_result: boolean
              p_details?: Json
            }
          | {
              p_operation: string
              p_table_name: string
              p_user_id: string
              p_result: boolean
              p_details?: Json
            }
          | {
              p_operation: string
              p_table_name: string
              p_user_id: string
              p_result: string
              p_details: Json
            }
        Returns: undefined
      }
      manage_credit_card_balance: {
        Args: { p_user_id: string; p_account_id: string; p_new_balance: number }
        Returns: Json
      }
      remove_family_member: {
        Args: { p_family_id: string; p_member_user_id: string }
        Returns: Json
      }
      restore_family_backup: {
        Args: { p_backup_id: string }
        Returns: Json
      }
      set_credit_card_balance: {
        Args: { p_user_id: string; p_account_id: string; p_new_balance: number }
        Returns: Json
      }
      test_auth_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_id: string
          has_auth_context: boolean
          test_message: string
        }[]
      }
      update_account_balance: {
        Args: { account_id_param: string }
        Returns: undefined
      }
      update_family_settings: {
        Args: {
          p_family_id: string
          p_nome: string
          p_description?: string
          p_settings?: Json
        }
        Returns: Json
      }
      update_member_role: {
        Args: {
          p_family_id: string
          p_member_user_id: string
          p_new_role: string
        }
        Returns: Json
      }
      validate_family_permission: {
        Args: { p_family_id: string; p_required_role: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
