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
      agency_program_settings: {
        Row: {
          airline_company_id: string
          cpf_limit: number
          cpf_period: string
          created_at: string
          id: string
          is_active: boolean
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          airline_company_id: string
          cpf_limit?: number
          cpf_period?: string
          created_at?: string
          id?: string
          is_active?: boolean
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          airline_company_id?: string
          cpf_limit?: number
          cpf_period?: string
          created_at?: string
          id?: string
          is_active?: boolean
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_program_settings_airline_company_id_fkey"
            columns: ["airline_company_id"]
            isOneToOne: false
            referencedRelation: "airline_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_program_settings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
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
          supplier_id: string
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
          supplier_id: string
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
          supplier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "airline_companies_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airline_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string
          diff: Json | null
          id: string
          record_id: string
          supplier_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by: string
          diff?: Json | null
          id?: string
          record_id: string
          supplier_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string
          diff?: Json | null
          id?: string
          record_id?: string
          supplier_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_subscriptions: {
        Row: {
          created_at: string
          grace_period_ends: string | null
          id: string
          pix_instructions: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          receipt_reviewed: boolean | null
          receipt_uploaded_at: string | null
          receipt_url: string | null
          renewal_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grace_period_ends?: string | null
          id?: string
          pix_instructions?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          receipt_reviewed?: boolean | null
          receipt_uploaded_at?: string | null
          receipt_url?: string | null
          renewal_date: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grace_period_ends?: string | null
          id?: string
          pix_instructions?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          receipt_reviewed?: boolean | null
          receipt_uploaded_at?: string | null
          receipt_url?: string | null
          renewal_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cpf_registry: {
        Row: {
          airline_company_id: string
          blocked_until: string | null
          cpf_encrypted: string
          created_at: string
          first_use_date: string | null
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
          first_use_date?: string | null
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
          first_use_date?: string | null
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
      credit_interest_config: {
        Row: {
          created_at: string | null
          id: string
          installments: number
          interest_rate: number
          is_active: boolean | null
          payment_type: string
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          installments: number
          interest_rate: number
          is_active?: boolean | null
          payment_type?: string
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          installments?: number
          interest_rate?: number
          is_active?: boolean | null
          payment_type?: string
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_interest_config_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          cpf_encrypted: string
          created_at: string | null
          email: string | null
          id: string
          last_purchase_at: string | null
          name: string
          phone: string | null
          supplier_id: string
          total_purchases: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          cpf_encrypted: string
          created_at?: string | null
          email?: string | null
          id?: string
          last_purchase_at?: string | null
          name: string
          phone?: string | null
          supplier_id: string
          total_purchases?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          cpf_encrypted?: string
          created_at?: string | null
          email?: string | null
          id?: string
          last_purchase_at?: string | null
          name?: string
          phone?: string | null
          supplier_id?: string
          total_purchases?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_accounts: {
        Row: {
          account_holder_cpf: string | null
          account_holder_name: string | null
          account_number: string
          airline_company_id: string
          balance: number
          cost_per_mile: number
          cpf_count: number
          cpf_limit: number
          created_at: string
          id: string
          last_cpf_renewal_at: string | null
          password_encrypted: string | null
          status: Database["public"]["Enums"]["account_status"]
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder_cpf?: string | null
          account_holder_name?: string | null
          account_number: string
          airline_company_id: string
          balance?: number
          cost_per_mile: number
          cpf_count?: number
          cpf_limit?: number
          created_at?: string
          id?: string
          last_cpf_renewal_at?: string | null
          password_encrypted?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder_cpf?: string | null
          account_holder_name?: string | null
          account_number?: string
          airline_company_id?: string
          balance?: number
          cost_per_mile?: number
          cpf_count?: number
          cpf_limit?: number
          created_at?: string
          id?: string
          last_cpf_renewal_at?: string | null
          password_encrypted?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          supplier_id?: string | null
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
            foreignKeyName: "mileage_accounts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      mileage_movements: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string
          id: string
          note: string | null
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mileage_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods_config: {
        Row: {
          additional_info: Json | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          method_name: string
          method_type: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          additional_info?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          method_name: string
          method_type: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          additional_info?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          method_name?: string
          method_type?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_config_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method: string
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
          supplier_id: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      program_rules: {
        Row: {
          airline_id: string
          cpf_limit: number
          id: string
          renewal_type: string
          supplier_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          airline_id: string
          cpf_limit?: number
          id?: string
          renewal_type: string
          supplier_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          airline_id?: string
          cpf_limit?: number
          id?: string
          renewal_type?: string
          supplier_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          attachments: Json | null
          boarding_fee: number | null
          client_name: string
          client_phone: string | null
          company_name: string | null
          converted_at: string | null
          converted_to_sale_id: string | null
          created_at: string
          departure_date: string | null
          final_price_with_interest: number | null
          flight_details: Json | null
          flight_segments: Json | null
          id: string
          installments: number | null
          interest_rate: number | null
          miles_needed: number
          passengers: number | null
          payment_methods: string[] | null
          route: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          total_price: number
          trip_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          boarding_fee?: number | null
          client_name: string
          client_phone?: string | null
          company_name?: string | null
          converted_at?: string | null
          converted_to_sale_id?: string | null
          created_at?: string
          departure_date?: string | null
          final_price_with_interest?: number | null
          flight_details?: Json | null
          flight_segments?: Json | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          miles_needed: number
          passengers?: number | null
          payment_methods?: string[] | null
          route?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_price: number
          trip_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          boarding_fee?: number | null
          client_name?: string
          client_phone?: string | null
          company_name?: string | null
          converted_at?: string | null
          converted_to_sale_id?: string | null
          created_at?: string
          departure_date?: string | null
          final_price_with_interest?: number | null
          flight_details?: Json | null
          flight_segments?: Json | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          miles_needed?: number
          passengers?: number | null
          payment_methods?: string[] | null
          route?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_price?: number
          trip_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_converted_to_sale_id_fkey"
            columns: ["converted_to_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          boarding_fee: number | null
          client_contact: string | null
          client_cpf_encrypted: string
          client_name: string
          cost_per_mile: number | null
          cost_per_mile_snapshot: number | null
          counter_airline_program: string | null
          counter_cost_per_thousand: number | null
          counter_seller_contact: string | null
          counter_seller_name: string | null
          cpf_used_id: string | null
          created_at: string
          customer_cpf: string | null
          customer_name: string | null
          customer_phone: string | null
          final_price_with_interest: number | null
          flight_segments: Json | null
          id: string
          installments: number | null
          interest_rate: number | null
          margin_percentage: number | null
          margin_value: number | null
          mileage_account_id: string | null
          miles_needed: number | null
          miles_used: number
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          passenger_cpfs: Json | null
          passengers: number | null
          payment_method: string | null
          payment_notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status_enum"]
          price_per_passenger: number | null
          price_total: number | null
          profit: number
          profit_estimate: number | null
          profit_margin: number
          route_text: string | null
          sale_price: number
          sale_source: string | null
          status: Database["public"]["Enums"]["sale_status"]
          supplier_id: string | null
          total_cost: number
          travel_dates: Json | null
          trip_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          boarding_fee?: number | null
          client_contact?: string | null
          client_cpf_encrypted: string
          client_name: string
          cost_per_mile?: number | null
          cost_per_mile_snapshot?: number | null
          counter_airline_program?: string | null
          counter_cost_per_thousand?: number | null
          counter_seller_contact?: string | null
          counter_seller_name?: string | null
          cpf_used_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          final_price_with_interest?: number | null
          flight_segments?: Json | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          margin_percentage?: number | null
          margin_value?: number | null
          mileage_account_id?: string | null
          miles_needed?: number | null
          miles_used: number
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          passenger_cpfs?: Json | null
          passengers?: number | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          price_per_passenger?: number | null
          price_total?: number | null
          profit: number
          profit_estimate?: number | null
          profit_margin: number
          route_text?: string | null
          sale_price: number
          sale_source?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          supplier_id?: string | null
          total_cost: number
          travel_dates?: Json | null
          trip_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          boarding_fee?: number | null
          client_contact?: string | null
          client_cpf_encrypted?: string
          client_name?: string
          cost_per_mile?: number | null
          cost_per_mile_snapshot?: number | null
          counter_airline_program?: string | null
          counter_cost_per_thousand?: number | null
          counter_seller_contact?: string | null
          counter_seller_name?: string | null
          cpf_used_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          final_price_with_interest?: number | null
          flight_segments?: Json | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          margin_percentage?: number | null
          margin_value?: number | null
          mileage_account_id?: string | null
          miles_needed?: number | null
          miles_used?: number
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          passenger_cpfs?: Json | null
          passengers?: number | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          price_per_passenger?: number | null
          price_total?: number | null
          profit?: number
          profit_estimate?: number | null
          profit_margin?: number
          route_text?: string | null
          sale_price?: number
          sale_source?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          supplier_id?: string | null
          total_cost?: number
          travel_dates?: Json | null
          trip_type?: string | null
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
            foreignKeyName: "sales_cpf_used_id_fkey"
            columns: ["cpf_used_id"]
            isOneToOne: false
            referencedRelation: "cpf_registry_with_status"
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
            foreignKeyName: "sales_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      supplier_transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          id: string
          miles_quantity: number | null
          notes: string | null
          sale_id: string | null
          supplier_id: string
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          id?: string
          miles_quantity?: number | null
          notes?: string | null
          sale_id?: string | null
          supplier_id: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          miles_quantity?: number | null
          notes?: string | null
          sale_id?: string | null
          supplier_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mileage_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          last_purchase_at: string | null
          name: string
          notes: string | null
          payment_type: string
          phone: string
          pix_key: string | null
          total_cost: number | null
          total_purchases: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_purchase_at?: string | null
          name: string
          notes?: string | null
          payment_type?: string
          phone: string
          pix_key?: string | null
          total_cost?: number | null
          total_purchases?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_purchase_at?: string | null
          name?: string
          notes?: string | null
          payment_type?: string
          phone?: string
          pix_key?: string | null
          total_cost?: number | null
          total_purchases?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers_airlines: {
        Row: {
          airline_company_id: string
          created_at: string
          supplier_id: string
        }
        Insert: {
          airline_company_id: string
          created_at?: string
          supplier_id: string
        }
        Update: {
          airline_company_id?: string
          created_at?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_airlines_airline_company_id_fkey"
            columns: ["airline_company_id"]
            isOneToOne: false
            referencedRelation: "airline_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_airlines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          airline: string
          attachments: Json | null
          created_at: string
          departure_date: string
          id: string
          issued_at: string | null
          passenger_cpf_encrypted: string
          passenger_name: string
          pnr: string | null
          return_date: string | null
          route: string
          sale_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          ticket_number: string | null
          updated_at: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          airline: string
          attachments?: Json | null
          created_at?: string
          departure_date: string
          id?: string
          issued_at?: string | null
          passenger_cpf_encrypted: string
          passenger_name: string
          pnr?: string | null
          return_date?: string | null
          route: string
          sale_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          ticket_number?: string | null
          updated_at?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          airline?: string
          attachments?: Json | null
          created_at?: string
          departure_date?: string
          id?: string
          issued_at?: string | null
          passenger_cpf_encrypted?: string
          passenger_name?: string
          pnr?: string | null
          return_date?: string | null
          route?: string
          sale_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          ticket_number?: string | null
          updated_at?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_code_requests: {
        Row: {
          account_id: string
          id: string
          received_at: string | null
          requested_at: string
          sale_id: string
          status: string
          supplier_id: string
          user_id: string
        }
        Insert: {
          account_id: string
          id?: string
          received_at?: string | null
          requested_at?: string
          sale_id: string
          status?: string
          supplier_id: string
          user_id: string
        }
        Update: {
          account_id?: string
          id?: string
          received_at?: string | null
          requested_at?: string
          sale_id?: string
          status?: string
          supplier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_code_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mileage_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_code_requests_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_code_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cpf_registry_with_status: {
        Row: {
          airline_company_id: string | null
          blocked_until: string | null
          computed_status: Database["public"]["Enums"]["cpf_status"] | null
          cpf_encrypted: string | null
          created_at: string | null
          first_use_date: string | null
          full_name: string | null
          id: string | null
          last_used_at: string | null
          renewal_near: boolean | null
          status: Database["public"]["Enums"]["cpf_status"] | null
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          airline_company_id?: string | null
          blocked_until?: string | null
          computed_status?: never
          cpf_encrypted?: string | null
          created_at?: string | null
          first_use_date?: string | null
          full_name?: string | null
          id?: string | null
          last_used_at?: string | null
          renewal_near?: never
          status?: Database["public"]["Enums"]["cpf_status"] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          airline_company_id?: string | null
          blocked_until?: string | null
          computed_status?: never
          cpf_encrypted?: string | null
          created_at?: string | null
          first_use_date?: string | null
          full_name?: string | null
          id?: string | null
          last_used_at?: string | null
          renewal_near?: never
          status?: Database["public"]["Enums"]["cpf_status"] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
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
    }
    Functions: {
      decrypt_cpf: { Args: { cpf_encrypted: string }; Returns: string }
      decrypt_password: {
        Args: { password_encrypted: string }
        Returns: string
      }
      encrypt_cpf: { Args: { cpf_text: string }; Returns: string }
      encrypt_password: { Args: { password_text: string }; Returns: string }
      ensure_profile_and_supplier: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_supplier_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_locked: { Args: { _user_id: string }; Returns: boolean }
      normalize_uppercase: { Args: { text_input: string }; Returns: string }
      update_account_balance: {
        Args: { account_id: string; miles_delta: number }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "inactive"
      app_role: "admin" | "supplier_owner" | "seller"
      cpf_status: "available" | "blocked" | "expired"
      payment_status_enum:
        | "pending"
        | "partial"
        | "paid"
        | "overdue"
        | "refunded"
      quote_status: "pending" | "sent" | "accepted" | "rejected" | "expired"
      renewal_type: "annual" | "rolling"
      sale_status: "pending" | "completed" | "cancelled"
      subscription_plan: "start" | "pro"
      subscription_status: "active" | "grace_period" | "suspended" | "cancelled"
      ticket_status: "confirmed" | "pending" | "cancelled"
      verification_status: "pending" | "requested" | "received" | "completed"
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
      app_role: ["admin", "supplier_owner", "seller"],
      cpf_status: ["available", "blocked", "expired"],
      payment_status_enum: [
        "pending",
        "partial",
        "paid",
        "overdue",
        "refunded",
      ],
      quote_status: ["pending", "sent", "accepted", "rejected", "expired"],
      renewal_type: ["annual", "rolling"],
      sale_status: ["pending", "completed", "cancelled"],
      subscription_plan: ["start", "pro"],
      subscription_status: ["active", "grace_period", "suspended", "cancelled"],
      ticket_status: ["confirmed", "pending", "cancelled"],
      verification_status: ["pending", "requested", "received", "completed"],
    },
  },
} as const
