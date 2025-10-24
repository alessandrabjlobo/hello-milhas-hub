export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      airline_companies: {
        Row: {
          code: string
          cost_per_mile: number
          cpf_limit: number
          created_at: string
          id: string
          name: string
          renewal_config: Json | null
          renewal_type: Database["public"]["Enums"]["renewal_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          cost_per_mile?: number
          cpf_limit?: number
          created_at?: string
          id?: string
          name: string
          renewal_config?: Json | null
          renewal_type?: Database["public"]["Enums"]["renewal_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          cost_per_mile?: number
          cpf_limit?: number
          created_at?: string
          id?: string
          name?: string
          renewal_config?: Json | null
          renewal_type?: Database["public"]["Enums"]["renewal_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "airline_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cpf_registry: {
        Row: {
          airline_company_id: string
          blocked_until: string | null
          cpf_encrypted: string
          created_at: string
          full_name: string
          id: string
          last_used_at: string | null
          status: Database["public"]["Enums"]["cpf_status"]
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          airline_company_id: string
          blocked_until?: string | null
          cpf_encrypted: string
          created_at?: string
          full_name: string
          id?: string
          last_used_at?: string | null
          status?: Database["public"]["Enums"]["cpf_status"]
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          airline_company_id?: string
          blocked_until?: string | null
          cpf_encrypted?: string
          created_at?: string
          full_name?: string
          id?: string
          last_used_at?: string | null
          status?: Database["public"]["Enums"]["cpf_status"]
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpf_registry_airline_company_id_fkey"
            columns: ["airline_company_id"]
            isOneToOne: false
            referencedRelation: "airline_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpf_registry_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_accounts: {
        Row: {
          account_number: string
          airline_company_id: string
          balance: number
          cost_per_mile: number
          created_at: string
          id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          airline_company_id: string
          balance?: number
          cost_per_mile: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          airline_company_id?: string
          balance?: number
          cost_per_mile?: number
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_accounts_airline_company_id_fkey"
            columns: ["airline_company_id"]
            isOneToOne: false
            referencedRelation: "airline_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          boarding_fee: number | null
          client_name: string
          client_phone: string | null
          company_name: string | null
          cost_per_thousand: number
          created_at: string
          departure_date: string | null
          id: string
          miles_needed: number
          passengers: number | null
          route: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          total_price: number
          trip_type: string | null
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          boarding_fee?: number | null
          client_name: string
          client_phone?: string | null
          company_name?: string | null
          cost_per_thousand: number
          created_at?: string
          departure_date?: string | null
          id?: string
          miles_needed: number
          passengers?: number | null
          route?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_price: number
          trip_type?: string | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          boarding_fee?: number | null
          client_name?: string
          client_phone?: string | null
          company_name?: string | null
          cost_per_thousand?: number
          created_at?: string
          departure_date?: string | null
          id?: string
          miles_needed?: number
          passengers?: number | null
          route?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_price?: number
          trip_type?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          client_contact: string | null
          client_cpf_encrypted: string
          client_name: string
          cost_per_mile: number
          cpf_used_id: string | null
          created_at: string
          id: string
          mileage_account_id: string | null
          miles_used: number
          notes: string | null
          profit: number
          profit_margin: number
          sale_price: number
          status: Database["public"]["Enums"]["sale_status"]
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_contact?: string | null
          client_cpf_encrypted: string
          client_name: string
          cost_per_mile: number
          cpf_used_id?: string | null
          created_at?: string
          id?: string
          mileage_account_id?: string | null
          miles_used: number
          notes?: string | null
          profit: number
          profit_margin: number
          sale_price: number
          status?: Database["public"]["Enums"]["sale_status"]
          total_cost: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_contact?: string | null
          client_cpf_encrypted?: string
          client_name?: string
          cost_per_mile?: number
          cpf_used_id?: string | null
          created_at?: string
          id?: string
          mileage_account_id?: string | null
          miles_used?: number
          notes?: string | null
          profit?: number
          profit_margin?: number
          sale_price?: number
          status?: Database["public"]["Enums"]["sale_status"]
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cpf_used_id_fkey"
            columns: ["cpf_used_id"]
            isOneToOne: false
            referencedRelation: "cpf_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_mileage_account_id_fkey"
            columns: ["mileage_account_id"]
            isOneToOne: false
            referencedRelation: "mileage_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          airline: string
          created_at: string
          departure_date: string
          id: string
          issued_at: string | null
          passenger_cpf_encrypted: string
          passenger_name: string
          return_date: string | null
          route: string
          sale_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          updated_at: string
        }
        Insert: {
          airline: string
          created_at?: string
          departure_date: string
          id?: string
          issued_at?: string | null
          passenger_cpf_encrypted: string
          passenger_name: string
          return_date?: string | null
          route: string
          sale_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          updated_at?: string
        }
        Update: {
          airline?: string
          created_at?: string
          departure_date?: string
          id?: string
          issued_at?: string | null
          passenger_cpf_encrypted?: string
          passenger_name?: string
          return_date?: string | null
          route?: string
          sale_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_cpf: { Args: { cpf_encrypted: string }; Returns: string }
      encrypt_cpf: { Args: { cpf_text: string }; Returns: string }
    }
    Enums: {
      account_status: "active" | "inactive"
      cpf_status: "available" | "blocked" | "expired"
      quote_status: "pending" | "sent" | "accepted" | "rejected" | "expired"
      renewal_type: "annual" | "rolling"
      sale_status: "pending" | "completed" | "cancelled"
      ticket_status: "confirmed" | "pending" | "cancelled"
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
    Enums: {
      account_status: ["active", "inactive"],
      cpf_status: ["available", "blocked", "expired"],
      quote_status: ["pending", "sent", "accepted", "rejected", "expired"],
      renewal_type: ["annual", "rolling"],
      sale_status: ["pending", "completed", "cancelled"],
      ticket_status: ["confirmed", "pending", "cancelled"],
    },
  },
} as const
