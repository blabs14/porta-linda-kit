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
          id: string
          nome: string
          tipo: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          tipo?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          tipo: string
          user_id: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          nome: string
          tipo: string
          user_id?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          family_id?: string | null
          id?: string
          nome?: string
          tipo?: string
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
          categoria_id: string | null
          created_at: string | null
          dia_vencimento: number
          id: string
          nome: string
          user_id: string
          valor: number
        }
        Insert: {
          ativa?: boolean | null
          categoria_id?: string | null
          created_at?: string | null
          dia_vencimento: number
          id?: string
          nome: string
          user_id: string
          valor: number
        }
        Update: {
          ativa?: boolean | null
          categoria_id?: string | null
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
      profiles: {
        Row: {
          created_at: string | null
          foto_url: string | null
          id: string
          nome: string
          percentual_divisao: number | null
          poupanca_mensal: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          percentual_divisao?: number | null
          poupanca_mensal?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          percentual_divisao?: number | null
          poupanca_mensal?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          categoria_id: string | null
          created_at: string | null
          data: string
          descricao: string | null
          family_id: string | null
          id: string
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          account_id?: string | null
          categoria_id?: string | null
          created_at?: string | null
          data: string
          descricao?: string | null
          family_id?: string | null
          id?: string
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          account_id?: string | null
          categoria_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string | null
          family_id?: string | null
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
        ]
      }
    }
    Views: {
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
    }
    Functions: {
      accept_family_invite: {
        Args: { invite_token: string }
        Returns: Json
      }
      accept_family_invite_by_email: {
        Args: { p_email: string; p_user_id: string } | { p_invite_id: string }
        Returns: Json
      }
      cancel_family_invite: {
        Args: { p_invite_id: string }
        Returns: Json
      }
      create_family_direct: {
        Args: { p_family_name: string; p_user_id: string }
        Returns: string
      }
      create_family_with_member: {
        Args: {
          p_family_name: string
          p_user_id: string
          p_description?: string
        }
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
      get_user_all_transactions: {
        Args: { p_user_id: string }
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
      get_user_families: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_user_family_data: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_pending_family_invites: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      invite_family_member_by_email: {
        Args: { p_family_id: string; p_email: string; p_role?: string }
        Returns: Json
      }
      log_permission_check: {
        Args: {
          p_operation: string
          p_table_name: string
          p_user_id: string
          p_result: boolean
          p_details?: Json
        }
        Returns: undefined
      }
      remove_family_member: {
        Args: { p_family_id: string; p_member_user_id: string }
        Returns: Json
      }
      test_family_data_access: {
        Args: { p_user_id: string }
        Returns: Json
      }
      test_get_user_family: {
        Args: { p_user_id: string }
        Returns: Json
      }
      test_rls_policies_comprehensive: {
        Args: { p_user_id: string }
        Returns: Json
      }
      test_user_access: {
        Args: { test_user_id: string }
        Returns: {
          table_name: string
          can_read: boolean
          record_count: number
        }[]
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
        Args: { p_family_id: string; p_required_role?: string }
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
