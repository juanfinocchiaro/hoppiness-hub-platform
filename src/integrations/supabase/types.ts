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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance_logs: {
        Row: {
          branch_id: string
          employee_id: string
          id: string
          log_type: string
          notes: string | null
          timestamp: string
        }
        Insert: {
          branch_id: string
          employee_id: string
          id?: string
          log_type: string
          notes?: string | null
          timestamp?: string
        }
        Update: {
          branch_id?: string
          employee_id?: string
          id?: string
          log_type?: string
          notes?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          branch_id: string
          check_in: string
          check_in_ip: unknown
          check_out: string | null
          check_out_ip: unknown
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          branch_id: string
          check_in?: string
          check_in_ip: unknown
          check_out?: string | null
          check_out_ip?: unknown
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string
          check_in?: string
          check_in_ip?: unknown
          check_out?: string | null
          check_out_ip?: unknown
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      attendance_tokens: {
        Row: {
          branch_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_tokens_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_tokens_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_tokens_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      availability_logs: {
        Row: {
          branch_id: string
          changed_by: string | null
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          new_state: boolean
          notes: string | null
          reason: string | null
          until_date: string | null
        }
        Insert: {
          branch_id: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          new_state: boolean
          notes?: string | null
          reason?: string | null
          until_date?: string | null
        }
        Update: {
          branch_id?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          new_state?: boolean
          notes?: string | null
          reason?: string | null
          until_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      availability_schedules: {
        Row: {
          category_id: string | null
          created_at: string
          days_of_week: number[] | null
          end_date: string | null
          end_time: string | null
          id: string
          is_active: boolean
          name: string | null
          product_id: string | null
          schedule_type: string
          start_date: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          days_of_week?: number[] | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          product_id?: string | null
          schedule_type: string
          start_date?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          days_of_week?: number[] | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          product_id?: string | null
          schedule_type?: string
          start_date?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_schedules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_schedules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_channels: {
        Row: {
          branch_id: string
          channel_id: string
          config: Json | null
          created_at: string | null
          custom_schedule: Json | null
          delivery_fee_override: number | null
          id: string
          is_enabled: boolean | null
          minimum_order_override: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          channel_id: string
          config?: Json | null
          created_at?: string | null
          custom_schedule?: Json | null
          delivery_fee_override?: number | null
          id?: string
          is_enabled?: boolean | null
          minimum_order_override?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          channel_id?: string
          config?: Json | null
          created_at?: string | null
          custom_schedule?: Json | null
          delivery_fee_override?: number | null
          id?: string
          is_enabled?: boolean | null
          minimum_order_override?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_channels_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_channels_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_channels_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_customer_accounts: {
        Row: {
          balance: number
          branch_id: string
          created_at: string
          credit_limit: number | null
          customer_id: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          balance?: number
          branch_id: string
          created_at?: string
          credit_limit?: number | null
          customer_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          balance?: number
          branch_id?: string
          created_at?: string
          credit_limit?: number | null
          customer_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_customer_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_customer_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_customer_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_customer_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_ingredients: {
        Row: {
          branch_id: string
          current_stock: number
          id: string
          ingredient_id: string
          is_tracked: boolean
          last_cost: number | null
          min_stock_override: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          current_stock?: number
          id?: string
          ingredient_id: string
          is_tracked?: boolean
          last_cost?: number | null
          min_stock_override?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          current_stock?: number
          id?: string
          ingredient_id?: string
          is_tracked?: boolean
          last_cost?: number | null
          min_stock_override?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_ingredients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ingredients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ingredients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_modifier_options: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_available: boolean
          is_enabled_by_brand: boolean
          modifier_option_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_enabled_by_brand?: boolean
          modifier_option_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_available?: boolean
          is_enabled_by_brand?: boolean
          modifier_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_modifier_options_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_modifier_options_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_modifier_options_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_modifier_options_modifier_option_id_fkey"
            columns: ["modifier_option_id"]
            isOneToOne: false
            referencedRelation: "modifier_options"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_permissions: {
        Row: {
          branch_id: string
          can_manage_inventory: boolean | null
          can_manage_orders: boolean | null
          can_manage_products: boolean | null
          can_manage_staff: boolean | null
          can_view_reports: boolean | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          can_manage_inventory?: boolean | null
          can_manage_orders?: boolean | null
          can_manage_products?: boolean | null
          can_manage_staff?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          can_manage_inventory?: boolean | null
          can_manage_orders?: boolean | null
          can_manage_products?: boolean | null
          can_manage_staff?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_permissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_permissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_permissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      branch_product_channel_availability: {
        Row: {
          branch_id: string
          channel_id: string
          id: string
          is_available: boolean | null
          local_price_override: number | null
          low_stock_threshold: number | null
          product_id: string
          stock_quantity: number | null
          unavailable_note: string | null
          unavailable_reason: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          channel_id: string
          id?: string
          is_available?: boolean | null
          local_price_override?: number | null
          low_stock_threshold?: number | null
          product_id: string
          stock_quantity?: number | null
          unavailable_note?: string | null
          unavailable_reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          channel_id?: string
          id?: string
          is_available?: boolean | null
          local_price_override?: number | null
          low_stock_threshold?: number | null
          product_id?: string
          stock_quantity?: number | null
          unavailable_note?: string | null
          unavailable_reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_product_channel_availability_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_product_channel_availability_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_product_channel_availability_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_product_channel_availability_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_product_channel_availability_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_products: {
        Row: {
          branch_id: string
          custom_price: number | null
          id: string
          is_available: boolean
          is_enabled_by_brand: boolean
          is_favorite: boolean | null
          product_id: string
          stock_quantity: number | null
        }
        Insert: {
          branch_id: string
          custom_price?: number | null
          id?: string
          is_available?: boolean
          is_enabled_by_brand?: boolean
          is_favorite?: boolean | null
          product_id: string
          stock_quantity?: number | null
        }
        Update: {
          branch_id?: string
          custom_price?: number | null
          id?: string
          is_available?: boolean
          is_enabled_by_brand?: boolean
          is_favorite?: boolean | null
          product_id?: string
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_schedules: {
        Row: {
          branch_id: string
          closes_at: string
          created_at: string
          day_of_week: number
          id: string
          is_enabled: boolean
          opens_at: string
          service_type: string
          shift_number: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          closes_at?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_enabled?: boolean
          opens_at?: string
          service_type: string
          shift_number?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          closes_at?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_enabled?: boolean
          opens_at?: string
          service_type?: string
          shift_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      branch_shift_settings: {
        Row: {
          branch_id: string
          created_at: string | null
          extended_shift_enabled: boolean | null
          id: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          extended_shift_enabled?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          extended_shift_enabled?: boolean | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_shift_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_shift_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_shift_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      branch_shifts: {
        Row: {
          branch_id: string
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      branch_suppliers: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          notes: string | null
          supplier_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          supplier_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "branch_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "branch_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          admin_force_channels: Json | null
          admin_force_message: string | null
          admin_force_state: string | null
          auto_invoice_integrations: boolean
          city: string
          closing_time: string | null
          created_at: string
          delivery_enabled: boolean | null
          dine_in_enabled: boolean | null
          email: string | null
          enforce_labor_law: boolean
          estimated_prep_time_min: number | null
          expense_pin_threshold: number | null
          facturante_api_key: string | null
          facturante_cuit: string | null
          facturante_enabled: boolean | null
          facturante_punto_venta: number | null
          fiscal_data: Json | null
          id: string
          invoice_provider: string | null
          is_active: boolean
          is_open: boolean | null
          latitude: number | null
          local_open_state: boolean | null
          longitude: number | null
          mercadopago_access_token: string | null
          mercadopago_delivery_enabled: boolean | null
          mercadopago_public_key: string | null
          mp_delivery_store_id: string | null
          name: string
          opening_time: string | null
          pedidosya_api_key: string | null
          pedidosya_enabled: boolean | null
          pedidosya_restaurant_id: string | null
          phone: string | null
          rappi_api_key: string | null
          rappi_enabled: boolean | null
          rappi_store_id: string | null
          slug: string | null
          takeaway_enabled: boolean | null
          updated_at: string
          webhook_api_key: string | null
        }
        Insert: {
          address: string
          admin_force_channels?: Json | null
          admin_force_message?: string | null
          admin_force_state?: string | null
          auto_invoice_integrations?: boolean
          city: string
          closing_time?: string | null
          created_at?: string
          delivery_enabled?: boolean | null
          dine_in_enabled?: boolean | null
          email?: string | null
          enforce_labor_law?: boolean
          estimated_prep_time_min?: number | null
          expense_pin_threshold?: number | null
          facturante_api_key?: string | null
          facturante_cuit?: string | null
          facturante_enabled?: boolean | null
          facturante_punto_venta?: number | null
          fiscal_data?: Json | null
          id?: string
          invoice_provider?: string | null
          is_active?: boolean
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          mercadopago_access_token?: string | null
          mercadopago_delivery_enabled?: boolean | null
          mercadopago_public_key?: string | null
          mp_delivery_store_id?: string | null
          name: string
          opening_time?: string | null
          pedidosya_api_key?: string | null
          pedidosya_enabled?: boolean | null
          pedidosya_restaurant_id?: string | null
          phone?: string | null
          rappi_api_key?: string | null
          rappi_enabled?: boolean | null
          rappi_store_id?: string | null
          slug?: string | null
          takeaway_enabled?: boolean | null
          updated_at?: string
          webhook_api_key?: string | null
        }
        Update: {
          address?: string
          admin_force_channels?: Json | null
          admin_force_message?: string | null
          admin_force_state?: string | null
          auto_invoice_integrations?: boolean
          city?: string
          closing_time?: string | null
          created_at?: string
          delivery_enabled?: boolean | null
          dine_in_enabled?: boolean | null
          email?: string | null
          enforce_labor_law?: boolean
          estimated_prep_time_min?: number | null
          expense_pin_threshold?: number | null
          facturante_api_key?: string | null
          facturante_cuit?: string | null
          facturante_enabled?: boolean | null
          facturante_punto_venta?: number | null
          fiscal_data?: Json | null
          id?: string
          invoice_provider?: string | null
          is_active?: boolean
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          mercadopago_access_token?: string | null
          mercadopago_delivery_enabled?: boolean | null
          mercadopago_public_key?: string | null
          mp_delivery_store_id?: string | null
          name?: string
          opening_time?: string | null
          pedidosya_api_key?: string | null
          pedidosya_enabled?: boolean | null
          pedidosya_restaurant_id?: string | null
          phone?: string | null
          rappi_api_key?: string | null
          rappi_enabled?: boolean | null
          rappi_store_id?: string | null
          slug?: string | null
          takeaway_enabled?: boolean | null
          updated_at?: string
          webhook_api_key?: string | null
        }
        Relationships: []
      }
      brand_mandatory_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      brand_mandatory_products: {
        Row: {
          alert_brand_on_backup: boolean | null
          backup_allowed_condition: string | null
          backup_product_name: string | null
          backup_supplier_id: string | null
          backup_units_per_package: number | null
          category_id: string | null
          created_at: string | null
          id: string
          ingredient_id: string | null
          is_active: boolean | null
          notes: string | null
          primary_supplier_id: string
          product_name: string
          purchase_multiple: number | null
          suggested_price: number | null
          unit_name: string
          units_per_package: number
          updated_at: string | null
        }
        Insert: {
          alert_brand_on_backup?: boolean | null
          backup_allowed_condition?: string | null
          backup_product_name?: string | null
          backup_supplier_id?: string | null
          backup_units_per_package?: number | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          is_active?: boolean | null
          notes?: string | null
          primary_supplier_id: string
          product_name: string
          purchase_multiple?: number | null
          suggested_price?: number | null
          unit_name?: string
          units_per_package?: number
          updated_at?: string | null
        }
        Update: {
          alert_brand_on_backup?: boolean | null
          backup_allowed_condition?: string | null
          backup_product_name?: string | null
          backup_supplier_id?: string | null
          backup_units_per_package?: number | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          is_active?: boolean | null
          notes?: string | null
          primary_supplier_id?: string
          product_name?: string
          purchase_multiple?: number | null
          suggested_price?: number | null
          unit_name?: string
          units_per_package?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_mandatory_products_backup_supplier_id_fkey"
            columns: ["backup_supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "brand_mandatory_products_backup_supplier_id_fkey"
            columns: ["backup_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mandatory_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "brand_mandatory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mandatory_products_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mandatory_products_primary_supplier_id_fkey"
            columns: ["primary_supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "brand_mandatory_products_primary_supplier_id_fkey"
            columns: ["primary_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_purchase_alerts: {
        Row: {
          alert_type: string
          branch_id: string
          created_at: string | null
          details: Json | null
          id: string
          mandatory_product_id: string | null
          seen_at: string | null
          seen_by: string | null
          supplier_used_id: string | null
        }
        Insert: {
          alert_type: string
          branch_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          mandatory_product_id?: string | null
          seen_at?: string | null
          seen_by?: string | null
          supplier_used_id?: string | null
        }
        Update: {
          alert_type?: string
          branch_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          mandatory_product_id?: string | null
          seen_at?: string | null
          seen_by?: string | null
          supplier_used_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_purchase_alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_purchase_alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_purchase_alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "brand_purchase_alerts_mandatory_product_id_fkey"
            columns: ["mandatory_product_id"]
            isOneToOne: false
            referencedRelation: "brand_mandatory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_purchase_alerts_supplier_used_id_fkey"
            columns: ["supplier_used_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "brand_purchase_alerts_supplier_used_id_fkey"
            columns: ["supplier_used_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_settings: {
        Row: {
          created_at: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          phone: string | null
          slogan: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          slogan?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          slogan?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      brand_template_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_template_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cash_register_movements: {
        Row: {
          amount: number
          authorized_by: string | null
          branch_id: string
          concept: string
          created_at: string
          id: string
          operated_by: string | null
          order_id: string | null
          payment_method: string
          recorded_by: string | null
          requires_authorization: boolean | null
          salary_advance_id: string | null
          shift_id: string
          transaction_id: string | null
          type: string
        }
        Insert: {
          amount: number
          authorized_by?: string | null
          branch_id: string
          concept: string
          created_at?: string
          id?: string
          operated_by?: string | null
          order_id?: string | null
          payment_method: string
          recorded_by?: string | null
          requires_authorization?: boolean | null
          salary_advance_id?: string | null
          shift_id: string
          transaction_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          authorized_by?: string | null
          branch_id?: string
          concept?: string
          created_at?: string
          id?: string
          operated_by?: string | null
          order_id?: string | null
          payment_method?: string
          recorded_by?: string | null
          requires_authorization?: boolean | null
          salary_advance_id?: string | null
          shift_id?: string
          transaction_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "cash_register_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_salary_advance_id_fkey"
            columns: ["salary_advance_id"]
            isOneToOne: false
            referencedRelation: "salary_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_register_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_register_shifts: {
        Row: {
          branch_id: string
          cash_register_id: string
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
          status: string
        }
        Insert: {
          branch_id: string
          cash_register_id: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount?: number
          status?: string
        }
        Update: {
          branch_id?: string
          cash_register_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "cash_register_shifts_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          branch_id: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      cashier_discrepancy_history: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_amount: number
          branch_id: string
          cash_register_id: string | null
          created_at: string | null
          discrepancy: number
          expected_amount: number
          id: string
          notes: string | null
          shift_date: string
          shift_id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_amount: number
          branch_id: string
          cash_register_id?: string | null
          created_at?: string | null
          discrepancy: number
          expected_amount: number
          id?: string
          notes?: string | null
          shift_date: string
          shift_id: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_amount?: number
          branch_id?: string
          cash_register_id?: string | null
          created_at?: string | null
          discrepancy?: number
          expected_amount?: number
          id?: string
          notes?: string | null
          shift_date?: string
          shift_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashier_discrepancy_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_discrepancy_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_discrepancy_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "cashier_discrepancy_history_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_discrepancy_history_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: true
            referencedRelation: "cash_register_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_type: string
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          integration_type: string | null
          is_active: boolean | null
          name: string
          requires_integration: boolean | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          channel_type: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          integration_type?: string | null
          is_active?: boolean | null
          name: string
          requires_integration?: boolean | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          channel_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          integration_type?: string | null
          is_active?: boolean | null
          name?: string
          requires_integration?: boolean | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coa_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean
          level: number
          name: string
          parent_id: string | null
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          level: number
          name: string
          parent_id?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coa_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "coa_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_items: {
        Row: {
          combo_id: string
          created_at: string
          id: string
          item_type: string
          modifier_group_id: string | null
          price_adjustment: number | null
          product_id: string | null
          quantity: number
          sort_order: number
        }
        Insert: {
          combo_id: string
          created_at?: string
          id?: string
          item_type: string
          modifier_group_id?: string | null
          price_adjustment?: number | null
          product_id?: string | null
          quantity?: number
          sort_order?: number
        }
        Update: {
          combo_id?: string
          created_at?: string
          id?: string
          item_type?: string
          modifier_group_id?: string | null
          price_adjustment?: number | null
          product_id?: string | null
          quantity?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_items_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          base_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication_reads: {
        Row: {
          communication_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          communication_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          communication_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_reads_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          body: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          target_branch_ids: string[] | null
          target_roles: string[] | null
          title: string
          type: Database["public"]["Enums"]["communication_type"] | null
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          target_branch_ids?: string[] | null
          target_roles?: string[] | null
          title: string
          type?: Database["public"]["Enums"]["communication_type"] | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          target_branch_ids?: string[] | null
          target_roles?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["communication_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          assigned_to: string | null
          attachment_name: string | null
          attachment_url: string | null
          created_at: string | null
          email: string
          employment_branch_id: string | null
          employment_cv_link: string | null
          employment_motivation: string | null
          employment_position: string | null
          franchise_has_location: string | null
          franchise_has_zone: string | null
          franchise_investment_capital: string | null
          id: string
          message: string | null
          name: string
          notes: string | null
          order_branch_id: string | null
          order_date: string | null
          order_issue: string | null
          order_number: string | null
          phone: string
          priority: string | null
          read_at: string | null
          replied_at: string | null
          replied_by: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string | null
          email: string
          employment_branch_id?: string | null
          employment_cv_link?: string | null
          employment_motivation?: string | null
          employment_position?: string | null
          franchise_has_location?: string | null
          franchise_has_zone?: string | null
          franchise_investment_capital?: string | null
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          order_branch_id?: string | null
          order_date?: string | null
          order_issue?: string | null
          order_number?: string | null
          phone: string
          priority?: string | null
          read_at?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string | null
          email?: string
          employment_branch_id?: string | null
          employment_cv_link?: string | null
          employment_motivation?: string | null
          employment_position?: string | null
          franchise_has_location?: string | null
          franchise_has_zone?: string | null
          franchise_investment_capital?: string | null
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          order_branch_id?: string | null
          order_date?: string | null
          order_issue?: string | null
          order_number?: string | null
          phone?: string
          priority?: string | null
          read_at?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_employment_branch_id_fkey"
            columns: ["employment_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_employment_branch_id_fkey"
            columns: ["employment_branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_employment_branch_id_fkey"
            columns: ["employment_branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "contact_messages_order_branch_id_fkey"
            columns: ["order_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_order_branch_id_fkey"
            columns: ["order_branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_order_branch_id_fkey"
            columns: ["order_branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      customer_account_movements: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          recorded_by: string | null
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          recorded_by?: string | null
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          recorded_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_account_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "branch_customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_account_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          apartment: string | null
          city: string | null
          created_at: string | null
          customer_id: string
          id: string
          is_default: boolean | null
          label: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          postal_code: string | null
          street_address: string
          updated_at: string | null
        }
        Insert: {
          apartment?: string | null
          city?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          postal_code?: string | null
          street_address: string
          updated_at?: string | null
        }
        Update: {
          apartment?: string | null
          city?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          postal_code?: string | null
          street_address?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_discounts: {
        Row: {
          auto_apply: boolean
          created_at: string
          customer_id: string
          discount_id: string
          id: string
          priority: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          auto_apply?: boolean
          created_at?: string
          customer_id: string
          discount_id: string
          id?: string
          priority?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          auto_apply?: boolean
          created_at?: string
          customer_id?: string
          discount_id?: string
          id?: string
          priority?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_discounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_discounts_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          avg_ticket: number | null
          branch_id: string | null
          customer_id: string
          favorite_products: string[] | null
          id: string
          last_order_at: string | null
          notes: string | null
          preferred_payment_method: string | null
          total_spent: number | null
          updated_at: string
          visit_count: number | null
        }
        Insert: {
          avg_ticket?: number | null
          branch_id?: string | null
          customer_id: string
          favorite_products?: string[] | null
          id?: string
          last_order_at?: string | null
          notes?: string | null
          preferred_payment_method?: string | null
          total_spent?: number | null
          updated_at?: string
          visit_count?: number | null
        }
        Update: {
          avg_ticket?: number | null
          branch_id?: string | null
          customer_id?: string
          favorite_products?: string[] | null
          id?: string
          last_order_at?: string | null
          notes?: string | null
          preferred_payment_method?: string | null
          total_spent?: number | null
          updated_at?: string
          visit_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_preferences_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_preferences_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_preferences_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          cuit: string | null
          dni: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          is_registered: boolean | null
          last_order_at: string | null
          notes: string | null
          phone: string | null
          preferred_branch_id: string | null
          registered_at: string | null
          total_orders: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          cuit?: string | null
          dni?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          is_registered?: boolean | null
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_branch_id?: string | null
          registered_at?: string | null
          total_orders?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          cuit?: string | null
          dni?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_registered?: boolean | null
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_branch_id?: string | null
          registered_at?: string | null
          total_orders?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_branch_id_fkey"
            columns: ["preferred_branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      daily_sales: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          sale_date: string
          sales_counter: number | null
          sales_mp_delivery: number | null
          sales_other: number | null
          sales_pedidosya: number | null
          sales_rappi: number | null
          sales_total: number | null
          shift: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          sale_date: string
          sales_counter?: number | null
          sales_mp_delivery?: number | null
          sales_other?: number | null
          sales_pedidosya?: number | null
          sales_rappi?: number | null
          sales_total?: number | null
          shift: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          sale_date?: string
          sales_counter?: number | null
          sales_mp_delivery?: number | null
          sales_other?: number | null
          sales_pedidosya?: number | null
          sales_rappi?: number | null
          sales_total?: number | null
          shift?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          base_fee: number | null
          branch_id: string
          created_at: string
          delivery_fee: number | null
          description: string | null
          display_order: number | null
          estimated_time_min: number | null
          id: string
          is_active: boolean
          max_distance_km: number | null
          min_order_amount: number | null
          name: string
          neighborhoods: string[] | null
          polygon_coords: Json | null
          price_per_km: number | null
          pricing_mode: string
          updated_at: string
        }
        Insert: {
          base_fee?: number | null
          branch_id: string
          created_at?: string
          delivery_fee?: number | null
          description?: string | null
          display_order?: number | null
          estimated_time_min?: number | null
          id?: string
          is_active?: boolean
          max_distance_km?: number | null
          min_order_amount?: number | null
          name: string
          neighborhoods?: string[] | null
          polygon_coords?: Json | null
          price_per_km?: number | null
          pricing_mode?: string
          updated_at?: string
        }
        Update: {
          base_fee?: number | null
          branch_id?: string
          created_at?: string
          delivery_fee?: number | null
          description?: string | null
          display_order?: number | null
          estimated_time_min?: number | null
          id?: string
          is_active?: boolean
          max_distance_km?: number | null
          min_order_amount?: number | null
          name?: string
          neighborhoods?: string[] | null
          polygon_coords?: Json | null
          price_per_km?: number | null
          pricing_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_zones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_zones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      discounts: {
        Row: {
          applies_to: string | null
          applies_to_ids: string[] | null
          code: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number | null
          name: string
          type: string
          updated_at: string
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          applies_to?: string | null
          applies_to_ids?: string[] | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          name: string
          type: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          applies_to?: string | null
          applies_to_ids?: string[] | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          name?: string
          type?: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      employee_data: {
        Row: {
          alias: string | null
          bank_name: string | null
          birth_date: string | null
          branch_id: string
          cbu: string | null
          created_at: string | null
          cuil: string | null
          dni: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          internal_notes: Json | null
          monthly_hours_target: number | null
          personal_address: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alias?: string | null
          bank_name?: string | null
          birth_date?: string | null
          branch_id: string
          cbu?: string | null
          created_at?: string | null
          cuil?: string | null
          dni?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          internal_notes?: Json | null
          monthly_hours_target?: number | null
          personal_address?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alias?: string | null
          bank_name?: string | null
          birth_date?: string | null
          branch_id?: string
          cbu?: string | null
          created_at?: string | null
          cuil?: string | null
          dni?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          internal_notes?: Json | null
          monthly_hours_target?: number | null
          personal_address?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_data_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_data_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_data_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          document_type: string
          employee_id: string
          file_name: string
          file_url: string
          id: string
          notes: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          employee_id: string
          file_name: string
          file_url: string
          id?: string
          notes?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          employee_id?: string
          file_name?: string
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_private_details: {
        Row: {
          accepted_terms_at: string | null
          address: string | null
          birth_date: string | null
          cbu: string | null
          created_at: string
          cuit: string | null
          dni: string | null
          dni_back_url: string | null
          dni_front_url: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          employee_id: string
          hourly_rate: number | null
          id: string
          updated_at: string
        }
        Insert: {
          accepted_terms_at?: string | null
          address?: string | null
          birth_date?: string | null
          cbu?: string | null
          created_at?: string
          cuit?: string | null
          dni?: string | null
          dni_back_url?: string | null
          dni_front_url?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_id: string
          hourly_rate?: number | null
          id?: string
          updated_at?: string
        }
        Update: {
          accepted_terms_at?: string | null
          address?: string | null
          birth_date?: string | null
          cbu?: string | null
          created_at?: string
          cuit?: string | null
          dni?: string | null
          dni_back_url?: string | null
          dni_front_url?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_id?: string
          hourly_rate?: number | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_private_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_private_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          is_day_off: boolean | null
          schedule_month: number | null
          schedule_year: number | null
          shift_number: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time: string
          id?: string
          is_day_off?: boolean | null
          schedule_month?: number | null
          schedule_year?: number | null
          shift_number?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          is_day_off?: boolean | null
          schedule_month?: number | null
          schedule_year?: number | null
          shift_number?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          description: string | null
          document_url: string | null
          employee_id: string
          id: string
          incident_date: string
          issued_by: string | null
          reason: string
          warning_type: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          description?: string | null
          document_url?: string | null
          employee_id: string
          id?: string
          incident_date?: string
          issued_by?: string | null
          reason: string
          warning_type: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          description?: string | null
          document_url?: string | null
          employee_id?: string
          id?: string
          incident_date?: string
          issued_by?: string | null
          reason?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_warnings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warnings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_basic"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          birth_date: string | null
          branch_id: string
          cbu: string | null
          created_at: string
          cuit: string | null
          current_status: string
          dni: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          phone: string | null
          photo_url: string | null
          pin_code: string
          position: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          branch_id: string
          cbu?: string | null
          created_at?: string
          cuit?: string | null
          current_status?: string
          dni?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          pin_code: string
          position?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          branch_id?: string
          cbu?: string | null
          created_at?: string
          cuit?: string | null
          current_status?: string
          dni?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          phone?: string | null
          photo_url?: string | null
          pin_code?: string
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      extracted_invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_percent: number | null
          display_order: number | null
          id: string
          invoice_id: string
          iva_rate: number | null
          matched_ingredient_id: string | null
          matched_product_id: string | null
          quantity: number | null
          subtotal: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          description: string
          discount_percent?: number | null
          display_order?: number | null
          id?: string
          invoice_id: string
          iva_rate?: number | null
          matched_ingredient_id?: string | null
          matched_product_id?: string | null
          quantity?: number | null
          subtotal?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          discount_percent?: number | null
          display_order?: number | null
          id?: string
          invoice_id?: string
          iva_rate?: number | null
          matched_ingredient_id?: string | null
          matched_product_id?: string | null
          quantity?: number | null
          subtotal?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "extracted_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_invoice_items_matched_ingredient_id_fkey"
            columns: ["matched_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_invoice_items_matched_product_id_fkey"
            columns: ["matched_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_invoices: {
        Row: {
          confidence_score: number | null
          created_at: string
          currency: string | null
          document_id: string
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: string | null
          is_reviewed: boolean | null
          iva_amount: number | null
          notes: string | null
          other_taxes: number | null
          payment_condition: string | null
          payment_method: string | null
          raw_extracted_data: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          subtotal: number | null
          supplier_address: string | null
          supplier_cuit: string | null
          supplier_iva_condition: string | null
          supplier_name: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          currency?: string | null
          document_id: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_reviewed?: boolean | null
          iva_amount?: number | null
          notes?: string | null
          other_taxes?: number | null
          payment_condition?: string | null
          payment_method?: string | null
          raw_extracted_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          subtotal?: number | null
          supplier_address?: string | null
          supplier_cuit?: string | null
          supplier_iva_condition?: string | null
          supplier_name?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          currency?: string | null
          document_id?: string
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_reviewed?: boolean | null
          iva_amount?: number | null
          notes?: string | null
          other_taxes?: number | null
          payment_condition?: string | null
          payment_method?: string | null
          raw_extracted_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          subtotal?: number | null
          supplier_address?: string | null
          supplier_cuit?: string | null
          supplier_iva_condition?: string | null
          supplier_name?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_invoices_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "scanned_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_accounts: {
        Row: {
          account_type: string
          branch_id: string
          code: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          account_type: string
          branch_id: string
          code: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          account_type?: string
          branch_id?: string
          code?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      ingredient_approved_suppliers: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          is_primary: boolean
          negotiated_price: number | null
          notes: string | null
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          is_primary?: boolean
          negotiated_price?: number | null
          notes?: string | null
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          is_primary?: boolean
          negotiated_price?: number | null
          notes?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_approved_suppliers_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_approved_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "ingredient_approved_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_categories: {
        Row: {
          cost_category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          cost_category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          cost_category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      ingredient_conversions: {
        Row: {
          branch_id: string
          cost_difference: number | null
          created_at: string | null
          from_ingredient_cost: number | null
          from_ingredient_id: string
          id: string
          performed_by: string | null
          quantity: number
          reason: string | null
          to_ingredient_cost: number | null
          to_ingredient_id: string
          triggered_by_product_id: string | null
        }
        Insert: {
          branch_id: string
          cost_difference?: number | null
          created_at?: string | null
          from_ingredient_cost?: number | null
          from_ingredient_id: string
          id?: string
          performed_by?: string | null
          quantity: number
          reason?: string | null
          to_ingredient_cost?: number | null
          to_ingredient_id: string
          triggered_by_product_id?: string | null
        }
        Update: {
          branch_id?: string
          cost_difference?: number | null
          created_at?: string | null
          from_ingredient_cost?: number | null
          from_ingredient_id?: string
          id?: string
          performed_by?: string | null
          quantity?: number
          reason?: string | null
          to_ingredient_cost?: number | null
          to_ingredient_id?: string
          triggered_by_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_conversions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_conversions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_conversions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "ingredient_conversions_from_ingredient_id_fkey"
            columns: ["from_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_conversions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ingredient_conversions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ingredient_conversions_to_ingredient_id_fkey"
            columns: ["to_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_conversions_triggered_by_product_id_fkey"
            columns: ["triggered_by_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_suppliers: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          is_primary: boolean | null
          min_order_quantity: number | null
          notes: string | null
          price_per_unit: number | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          is_primary?: boolean | null
          min_order_quantity?: number | null
          notes?: string | null
          price_per_unit?: number | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          is_primary?: boolean | null
          min_order_quantity?: number | null
          notes?: string | null
          price_per_unit?: number | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_suppliers_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "ingredient_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_unit_conversions: {
        Row: {
          conversion_factor: number
          created_at: string
          from_unit: string
          id: string
          ingredient_id: string
          is_purchase_to_usage: boolean | null
          notes: string | null
          to_unit: string
        }
        Insert: {
          conversion_factor?: number
          created_at?: string
          from_unit: string
          id?: string
          ingredient_id: string
          is_purchase_to_usage?: boolean | null
          notes?: string | null
          to_unit: string
        }
        Update: {
          conversion_factor?: number
          created_at?: string
          from_unit?: string
          id?: string
          ingredient_id?: string
          is_purchase_to_usage?: boolean | null
          notes?: string | null
          to_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_unit_conversions_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          alternative_ingredient_id: string | null
          avg_daily_consumption: number | null
          category: string | null
          category_id: string | null
          cost_category: string | null
          cost_per_unit: number | null
          cost_updated_at: string | null
          created_at: string
          id: string
          is_active: boolean
          lead_time_days: number | null
          min_stock: number | null
          name: string
          notes: string | null
          notify_on_alternative_use: boolean | null
          purchase_unit: string | null
          purchase_unit_qty: number | null
          safety_stock_days: number | null
          sku: string | null
          supplier_control: Database["public"]["Enums"]["supplier_control_type"]
          unit: string
          updated_at: string
          usage_unit: string | null
        }
        Insert: {
          alternative_ingredient_id?: string | null
          avg_daily_consumption?: number | null
          category?: string | null
          category_id?: string | null
          cost_category?: string | null
          cost_per_unit?: number | null
          cost_updated_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_stock?: number | null
          name: string
          notes?: string | null
          notify_on_alternative_use?: boolean | null
          purchase_unit?: string | null
          purchase_unit_qty?: number | null
          safety_stock_days?: number | null
          sku?: string | null
          supplier_control?: Database["public"]["Enums"]["supplier_control_type"]
          unit?: string
          updated_at?: string
          usage_unit?: string | null
        }
        Update: {
          alternative_ingredient_id?: string | null
          avg_daily_consumption?: number | null
          category?: string | null
          category_id?: string | null
          cost_category?: string | null
          cost_per_unit?: number | null
          cost_updated_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_stock?: number | null
          name?: string
          notes?: string | null
          notify_on_alternative_use?: boolean | null
          purchase_unit?: string | null
          purchase_unit_qty?: number | null
          safety_stock_days?: number | null
          sku?: string | null
          supplier_control?: Database["public"]["Enums"]["supplier_control_type"]
          unit?: string
          updated_at?: string
          usage_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_alternative_ingredient_id_fkey"
            columns: ["alternative_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ingredient_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_lines: {
        Row: {
          count_id: string
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string
          difference: number | null
          id: string
          ingredient_id: string | null
          notes: string | null
          product_id: string | null
          system_quantity: number | null
          unit_cost: number | null
        }
        Insert: {
          count_id: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          difference?: number | null
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          product_id?: string | null
          system_quantity?: number | null
          unit_cost?: number | null
        }
        Update: {
          count_id?: string
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          difference?: number | null
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          product_id?: string | null
          system_quantity?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_lines_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_lines_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          branch_id: string
          completed_at: string | null
          completed_by: string | null
          count_date: string
          count_type: string | null
          created_at: string
          id: string
          notes: string | null
          started_by: string | null
          status: string
        }
        Insert: {
          branch_id: string
          completed_at?: string | null
          completed_by?: string | null
          count_date?: string
          count_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          started_by?: string | null
          status?: string
        }
        Update: {
          branch_id?: string
          completed_at?: string | null
          completed_by?: string | null
          count_date?: string
          count_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          started_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      kds_settings: {
        Row: {
          alert_threshold_minutes: number | null
          auto_bump_enabled: boolean | null
          auto_bump_minutes: number | null
          branch_id: string
          created_at: string
          font_size: string | null
          id: string
          primary_color: string | null
          show_timer: boolean | null
          sound_enabled: boolean | null
          sound_volume: number | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          alert_threshold_minutes?: number | null
          auto_bump_enabled?: boolean | null
          auto_bump_minutes?: number | null
          branch_id: string
          created_at?: string
          font_size?: string | null
          id?: string
          primary_color?: string | null
          show_timer?: boolean | null
          sound_enabled?: boolean | null
          sound_volume?: number | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          alert_threshold_minutes?: number | null
          auto_bump_enabled?: boolean | null
          auto_bump_minutes?: number | null
          branch_id?: string
          created_at?: string
          font_size?: string | null
          id?: string
          primary_color?: string | null
          show_timer?: boolean | null
          sound_enabled?: boolean | null
          sound_volume?: number | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kds_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kds_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kds_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      kds_stations: {
        Row: {
          branch_id: string
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          station_type: string
        }
        Insert: {
          branch_id: string
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          station_type: string
        }
        Update: {
          branch_id?: string
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          station_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kds_stations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kds_stations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kds_stations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      kds_tokens: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string | null
          token: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string | null
          token?: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "kds_tokens_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kds_tokens_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kds_tokens_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      loan_installments: {
        Row: {
          amount_capital: number
          amount_interest: number | null
          amount_paid: number | null
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          loan_id: string
          notes: string | null
          paid_at: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount_capital: number
          amount_interest?: number | null
          amount_paid?: number | null
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          loan_id: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount_capital?: number
          amount_interest?: number | null
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          loan_id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_installments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          branch_id: string
          coa_account_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          income_transaction_id: string | null
          interest_rate: number | null
          lender_name: string
          notes: string | null
          num_installments: number
          principal_amount: number
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          coa_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          income_transaction_id?: string | null
          interest_rate?: number | null
          lender_name: string
          notes?: string | null
          num_installments: number
          principal_amount: number
          start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          coa_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          income_transaction_id?: string | null
          interest_rate?: number | null
          lender_name?: string
          notes?: string | null
          num_installments?: number
          principal_amount?: number
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "loans_coa_account_id_fkey"
            columns: ["coa_account_id"]
            isOneToOne: false
            referencedRelation: "coa_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_income_transaction_id_fkey"
            columns: ["income_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      local_template_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_template_permissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "local_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      local_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      modifier_groups: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          max_selections: number | null
          min_selections: number | null
          modifier_type: string
          name: string
          selection_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          max_selections?: number | null
          min_selections?: number | null
          modifier_type?: string
          name: string
          selection_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          max_selections?: number | null
          min_selections?: number | null
          modifier_type?: string
          name?: string
          selection_type?: string
        }
        Relationships: []
      }
      modifier_options: {
        Row: {
          created_at: string
          display_order: number | null
          group_id: string
          id: string
          image_url: string | null
          is_active: boolean
          is_enabled_by_brand: boolean
          linked_ingredient_id: string | null
          linked_product_id: string | null
          name: string
          price_adjustment: number
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          group_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_enabled_by_brand?: boolean
          linked_ingredient_id?: string | null
          linked_product_id?: string | null
          name: string
          price_adjustment?: number
        }
        Update: {
          created_at?: string
          display_order?: number | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_enabled_by_brand?: boolean
          linked_ingredient_id?: string | null
          linked_product_id?: string | null
          name?: string
          price_adjustment?: number
        }
        Relationships: [
          {
            foreignKeyName: "modifier_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modifier_options_linked_ingredient_id_fkey"
            columns: ["linked_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modifier_options_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_session_logs: {
        Row: {
          action_type: string
          branch_id: string
          created_at: string | null
          current_user_id: string
          id: string
          ip_address: unknown
          previous_user_id: string | null
          triggered_by: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          branch_id: string
          created_at?: string | null
          current_user_id: string
          id?: string
          ip_address?: unknown
          previous_user_id?: string | null
          triggered_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          branch_id?: string
          created_at?: string | null
          current_user_id?: string
          id?: string
          ip_address?: unknown
          previous_user_id?: string | null
          triggered_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_session_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_session_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_session_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      order_cancellations: {
        Row: {
          cancel_notes: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          id: string
          order_id: string
          refund_amount: number | null
          refund_method: string | null
        }
        Insert: {
          cancel_notes?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          id?: string
          order_id: string
          refund_amount?: number | null
          refund_method?: string | null
        }
        Update: {
          cancel_notes?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          id?: string
          order_id?: string
          refund_amount?: number | null
          refund_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_discounts: {
        Row: {
          amount_applied: number
          applied_by: string | null
          created_at: string
          discount_id: string | null
          discount_name: string
          discount_type: string
          discount_value: number
          id: string
          order_id: string
        }
        Insert: {
          amount_applied: number
          applied_by?: string | null
          created_at?: string
          discount_id?: string | null
          discount_name: string
          discount_type: string
          discount_value: number
          id?: string
          order_id: string
        }
        Update: {
          amount_applied?: number
          applied_by?: string | null
          created_at?: string
          discount_id?: string | null
          discount_name?: string
          discount_type?: string
          discount_value?: number
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_discounts_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_discounts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_modifiers: {
        Row: {
          created_at: string
          id: string
          modifier_option_id: string
          option_name: string
          order_item_id: string
          price_adjustment: number
          source_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          modifier_option_id: string
          option_name: string
          order_item_id: string
          price_adjustment?: number
          source_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          modifier_option_id?: string
          option_name?: string
          order_item_id?: string
          price_adjustment?: number
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_item_modifiers_modifier_option_id_fkey"
            columns: ["modifier_option_id"]
            isOneToOne: false
            referencedRelation: "modifier_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_modifiers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_stations: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          order_item_id: string
          started_at: string | null
          station_type: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          order_item_id: string
          started_at?: string | null
          station_type: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          order_item_id?: string
          started_at?: string | null
          station_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_stations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          guest_number: number | null
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name_snapshot: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          guest_number?: number | null
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name_snapshot?: string | null
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          guest_number?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name_snapshot?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          payment_method: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          payment_method: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number | null
          branch_id: string
          caller_number: number | null
          channel_id: string | null
          created_at: string
          customer_business_name: string | null
          customer_cuit: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_fee: number | null
          discount_total: number | null
          estimated_time: string | null
          external_order_id: string | null
          id: string
          integration_accepted_at: string | null
          integration_accepted_by: string | null
          integration_rejected_at: string | null
          integration_rejected_by: string | null
          integration_rejection_reason: string | null
          integration_status: string | null
          invoice_type: string
          is_finalized: boolean | null
          notes: string | null
          order_area: Database["public"]["Enums"]["order_area"] | null
          order_group_id: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          sales_channel: Database["public"]["Enums"]["sales_channel"] | null
          service_type: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_number: string | null
          tax: number | null
          tip_amount: number | null
          total: number
          tracking_token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          branch_id: string
          caller_number?: number | null
          channel_id?: string | null
          created_at?: string
          customer_business_name?: string | null
          customer_cuit?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_fee?: number | null
          discount_total?: number | null
          estimated_time?: string | null
          external_order_id?: string | null
          id?: string
          integration_accepted_at?: string | null
          integration_accepted_by?: string | null
          integration_rejected_at?: string | null
          integration_rejected_by?: string | null
          integration_rejection_reason?: string | null
          integration_status?: string | null
          invoice_type?: string
          is_finalized?: boolean | null
          notes?: string | null
          order_area?: Database["public"]["Enums"]["order_area"] | null
          order_group_id?: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          sales_channel?: Database["public"]["Enums"]["sales_channel"] | null
          service_type?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_number?: string | null
          tax?: number | null
          tip_amount?: number | null
          total: number
          tracking_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          branch_id?: string
          caller_number?: number | null
          channel_id?: string | null
          created_at?: string
          customer_business_name?: string | null
          customer_cuit?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          discount_total?: number | null
          estimated_time?: string | null
          external_order_id?: string | null
          id?: string
          integration_accepted_at?: string | null
          integration_accepted_by?: string | null
          integration_rejected_at?: string | null
          integration_rejected_by?: string | null
          integration_rejection_reason?: string | null
          integration_status?: string | null
          invoice_type?: string
          is_finalized?: boolean | null
          notes?: string | null
          order_area?: Database["public"]["Enums"]["order_area"] | null
          order_group_id?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          sales_channel?: Database["public"]["Enums"]["sales_channel"] | null
          service_type?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_number?: string | null
          tax?: number | null
          tip_amount?: number | null
          total?: number
          tracking_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "orders_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          branch_id: string
          code: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          is_cash: boolean
          name: string
        }
        Insert: {
          branch_id: string
          code: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_cash?: boolean
          name: string
        }
        Update: {
          branch_id?: string
          code?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_cash?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      payment_plan_installments: {
        Row: {
          amount_capital: number
          amount_interest: number | null
          amount_paid: number | null
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          paid_at: string | null
          plan_id: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount_capital: number
          amount_interest?: number | null
          amount_paid?: number | null
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          paid_at?: string | null
          plan_id: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount_capital?: number
          amount_interest?: number | null
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_at?: string | null
          plan_id?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_installments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plan_installments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          description: string
          down_payment: number | null
          id: string
          interest_rate: number | null
          notes: string | null
          num_installments: number
          start_date: string
          status: string
          tax_obligation_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          down_payment?: number | null
          id?: string
          interest_rate?: number | null
          notes?: string | null
          num_installments: number
          start_date: string
          status?: string
          tax_obligation_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          down_payment?: number | null
          id?: string
          interest_rate?: number | null
          notes?: string | null
          num_installments?: number
          start_date?: string
          status?: string
          tax_obligation_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "payment_plans_tax_obligation_id_fkey"
            columns: ["tax_obligation_id"]
            isOneToOne: false
            referencedRelation: "tax_obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          employee_id: string
          id: string
          ledger_transaction_id: string | null
          period_id: string
          source: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_id: string
          id?: string
          ledger_transaction_id?: string | null
          period_id: string
          source?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          ledger_transaction_id?: string | null
          period_id?: string
          source?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          amount_black: number | null
          amount_white: number | null
          employee_id: string
          id: string
          include_in_tips: boolean | null
          notes: string | null
          period_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount_black?: number | null
          amount_white?: number | null
          employee_id: string
          id?: string
          include_in_tips?: boolean | null
          notes?: string | null
          period_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount_black?: number | null
          amount_white?: number | null
          employee_id?: string
          id?: string
          include_in_tips?: boolean | null
          notes?: string | null
          period_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          ledger_transaction_id: string | null
          method: string | null
          notes: string | null
          payment_date: string
          period_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          ledger_transaction_id?: string | null
          method?: string | null
          notes?: string | null
          payment_date?: string
          period_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          ledger_transaction_id?: string | null
          method?: string | null
          notes?: string | null
          payment_date?: string
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          branch_id: string
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          month: string
          status: string
          tip_distribution_method: string | null
          tip_pool_amount: number | null
        }
        Insert: {
          branch_id: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          month: string
          status?: string
          tip_distribution_method?: string | null
          tip_pool_amount?: number | null
        }
        Update: {
          branch_id?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          month?: string
          status?: string
          tip_distribution_method?: string | null
          tip_pool_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      permission_audit_logs: {
        Row: {
          action: string
          branch_id: string
          created_at: string
          id: string
          permission_keys: string[]
          reason: string | null
          target_user_id: string
          user_id: string
        }
        Insert: {
          action: string
          branch_id: string
          created_at?: string
          id?: string
          permission_keys: string[]
          reason?: string | null
          target_user_id: string
          user_id: string
        }
        Update: {
          action?: string
          branch_id?: string
          created_at?: string
          id?: string
          permission_keys?: string[]
          reason?: string | null
          target_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      permission_definitions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          min_role: Database["public"]["Enums"]["app_role"]
          module: string
          name: string
          scope: Database["public"]["Enums"]["permission_scope"]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          min_role?: Database["public"]["Enums"]["app_role"]
          module: string
          name: string
          scope?: Database["public"]["Enums"]["permission_scope"]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          min_role?: Database["public"]["Enums"]["app_role"]
          module?: string
          name?: string
          scope?: Database["public"]["Enums"]["permission_scope"]
        }
        Relationships: []
      }
      printers: {
        Row: {
          auto_cut: boolean | null
          branch_id: string
          created_at: string
          display_order: number | null
          id: string
          ip_address: string | null
          is_active: boolean
          is_default: boolean
          name: string
          paper_width: number | null
          port: number | null
          print_copies: number | null
          purpose: string
          type: string
          updated_at: string
        }
        Insert: {
          auto_cut?: boolean | null
          branch_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          is_default?: boolean
          name: string
          paper_width?: number | null
          port?: number | null
          print_copies?: number | null
          purpose?: string
          type?: string
          updated_at?: string
        }
        Update: {
          auto_cut?: boolean | null
          branch_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          is_default?: boolean
          name?: string
          paper_width?: number | null
          port?: number | null
          print_copies?: number | null
          purpose?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      product_allowed_channels: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          is_allowed: boolean | null
          notes: string | null
          price_override: number | null
          product_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          notes?: string | null
          price_override?: number | null
          product_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          notes?: string | null
          price_override?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_allowed_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_allowed_channels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      product_modifier_assignments: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_enabled: boolean
          modifier_group_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          modifier_group_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          modifier_group_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modifier_assignments_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifier_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifier_options: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          modifier_option_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          modifier_option_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          modifier_option_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modifier_options_modifier_option_id_fkey"
            columns: ["modifier_option_id"]
            isOneToOne: false
            referencedRelation: "modifier_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifier_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          notes: string | null
          product_id: string
          quantity_required: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          notes?: string | null
          product_id: string
          quantity_required: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          notes?: string | null
          product_id?: string
          quantity_required?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_station_assignments: {
        Row: {
          created_at: string
          display_order: number
          id: string
          product_id: string
          station_type: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          product_id: string
          station_type: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          product_id?: string
          station_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_station_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allergens: string[] | null
          category_id: string | null
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          image_updated_at: string | null
          image_url: string | null
          is_active: boolean
          is_available_all_branches: boolean | null
          is_enabled_by_brand: boolean
          is_featured: boolean | null
          name: string
          pos_thumb_url: string | null
          preparation_time: number | null
          price: number
          product_type: string
          sku: string | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          image_updated_at?: string | null
          image_url?: string | null
          is_active?: boolean
          is_available_all_branches?: boolean | null
          is_enabled_by_brand?: boolean
          is_featured?: boolean | null
          name: string
          pos_thumb_url?: string | null
          preparation_time?: number | null
          price: number
          product_type?: string
          sku?: string | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          image_updated_at?: string | null
          image_url?: string | null
          is_active?: boolean
          is_available_all_branches?: boolean | null
          is_enabled_by_brand?: boolean
          is_featured?: boolean | null
          name?: string
          pos_thumb_url?: string | null
          preparation_time?: number | null
          price?: number
          product_type?: string
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          cbu: string | null
          created_at: string
          cuit: string | null
          default_address: string | null
          default_address_lat: number | null
          default_address_lng: number | null
          dni: string | null
          dni_back_url: string | null
          dni_front_url: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          favorite_branch_id: string | null
          full_name: string
          id: string
          internal_notes: Json | null
          invitation_token: string | null
          is_active: boolean
          last_order_at: string | null
          loyalty_points: number | null
          phone: string | null
          pin_hash: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_terms_at?: string | null
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cbu?: string | null
          created_at?: string
          cuit?: string | null
          default_address?: string | null
          default_address_lat?: number | null
          default_address_lng?: number | null
          dni?: string | null
          dni_back_url?: string | null
          dni_front_url?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          favorite_branch_id?: string | null
          full_name: string
          id?: string
          internal_notes?: Json | null
          invitation_token?: string | null
          is_active?: boolean
          last_order_at?: string | null
          loyalty_points?: number | null
          phone?: string | null
          pin_hash?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_terms_at?: string | null
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cbu?: string | null
          created_at?: string
          cuit?: string | null
          default_address?: string | null
          default_address_lat?: number | null
          default_address_lng?: number | null
          dni?: string | null
          dni_back_url?: string | null
          dni_front_url?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          favorite_branch_id?: string | null
          full_name?: string
          id?: string
          internal_notes?: Json | null
          invitation_token?: string | null
          is_active?: boolean
          last_order_at?: string | null
          loyalty_points?: number | null
          phone?: string | null
          pin_hash?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_favorite_branch_id_fkey"
            columns: ["favorite_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_favorite_branch_id_fkey"
            columns: ["favorite_branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_favorite_branch_id_fkey"
            columns: ["favorite_branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      role_default_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_default_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permission_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
      salary_advances: {
        Row: {
          amount: number
          authorized_at: string | null
          authorized_by: string | null
          branch_id: string
          created_at: string | null
          created_by: string | null
          deducted_at: string | null
          deducted_in_payroll_id: string | null
          employee_id: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string
          reason: string | null
          shift_id: string | null
          status: string
          transfer_reference: string | null
          transferred_at: string | null
          transferred_by: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          authorized_at?: string | null
          authorized_by?: string | null
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          deducted_at?: string | null
          deducted_in_payroll_id?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method: string
          reason?: string | null
          shift_id?: string | null
          status?: string
          transfer_reference?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          authorized_at?: string | null
          authorized_by?: string | null
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          deducted_at?: string | null
          deducted_in_payroll_id?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string
          reason?: string | null
          shift_id?: string | null
          status?: string
          transfer_reference?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "salary_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_register_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      scanned_documents: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          document_type: string | null
          error_message: string | null
          file_name: string
          file_path: string | null
          file_url: string
          id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          error_message?: string | null
          file_name: string
          file_path?: string | null
          file_url: string
          id?: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          error_message?: string | null
          file_name?: string
          file_path?: string | null
          file_url?: string
          id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scanned_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scanned_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scanned_documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      shift_closures: {
        Row: {
          average_ticket: number | null
          branch_id: string
          cancelled_amount: number | null
          cancelled_orders: number | null
          cash_registers_summary: Json | null
          closure_date: string
          created_at: string | null
          created_by: string | null
          end_time: string
          id: string
          notes: string[] | null
          sales_by_channel: Json | null
          sales_by_payment: Json | null
          sales_by_product: Json | null
          shift_id: string | null
          shift_name: string
          staff_summary: Json | null
          start_time: string
          total_orders: number
          total_sales: number
          total_staff_hours: number | null
        }
        Insert: {
          average_ticket?: number | null
          branch_id: string
          cancelled_amount?: number | null
          cancelled_orders?: number | null
          cash_registers_summary?: Json | null
          closure_date: string
          created_at?: string | null
          created_by?: string | null
          end_time: string
          id?: string
          notes?: string[] | null
          sales_by_channel?: Json | null
          sales_by_payment?: Json | null
          sales_by_product?: Json | null
          shift_id?: string | null
          shift_name: string
          staff_summary?: Json | null
          start_time: string
          total_orders?: number
          total_sales?: number
          total_staff_hours?: number | null
        }
        Update: {
          average_ticket?: number | null
          branch_id?: string
          cancelled_amount?: number | null
          cancelled_orders?: number | null
          cash_registers_summary?: Json | null
          closure_date?: string
          created_at?: string | null
          created_by?: string | null
          end_time?: string
          id?: string
          notes?: string[] | null
          sales_by_channel?: Json | null
          sales_by_payment?: Json | null
          sales_by_product?: Json | null
          shift_id?: string | null
          shift_name?: string
          staff_summary?: Json | null
          start_time?: string
          total_orders?: number
          total_sales?: number
          total_staff_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_closures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_closures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_closures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "shift_closures_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "branch_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_notes: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          id: string
          note: string
          shift_date: string
          shift_name: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note: string
          shift_date?: string
          shift_name: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string
          shift_date?: string
          shift_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_notes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_notes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_notes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          branch_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          ingredient_id: string | null
          notes: string | null
          product_id: string | null
          quantity: number
          recorded_by: string | null
          reference_id: string | null
          reference_type: string | null
          supplier_invoice_id: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost: number | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          product_id?: string | null
          quantity: number
          recorded_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          supplier_invoice_id?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost?: number | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          product_id?: string | null
          quantity?: number
          recorded_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          supplier_invoice_id?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_invoice_id_fkey"
            columns: ["supplier_invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      supplier_invoice_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          ingredient_id: string | null
          invoice_id: string
          quantity: number
          subtotal: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          ingredient_id?: string | null
          invoice_id: string
          quantity: number
          subtotal: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          ingredient_id?: string | null
          invoice_id?: string
          quantity?: number
          subtotal?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoice_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          branch_id: string
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          invoice_type: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string
          tax_amount: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number?: string | null
          invoice_type: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id: string
          tax_amount?: number | null
          total: number
          updated_at?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          invoice_type?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string
          tax_amount?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_order_rules: {
        Row: {
          created_at: string | null
          delivery_day: number
          delivery_time: string | null
          id: string
          is_active: boolean | null
          order_shift_day: number
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_day: number
          delivery_time?: string | null
          id?: string
          is_active?: boolean | null
          order_shift_day: number
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          delivery_day?: number
          delivery_time?: string | null
          id?: string
          is_active?: boolean | null
          order_shift_day?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_order_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_order_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          branch_id: string
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string | null
          items: Json
          notes: string | null
          received_at: string | null
          sent_at: string | null
          sent_via: string | null
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          items?: Json
          notes?: string | null
          received_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          items?: Json
          notes?: string | null
          received_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "supplier_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "supplier_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_origin: Database["public"]["Enums"]["payment_origin"]
          recorded_by: string | null
          supplier_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_origin?: Database["public"]["Enums"]["payment_origin"]
          recorded_by?: string | null
          supplier_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_origin?: Database["public"]["Enums"]["payment_origin"]
          recorded_by?: string | null
          supplier_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          branch_id: string | null
          category: string | null
          category_id: string | null
          contact_name: string | null
          created_at: string
          cuit: string | null
          default_doc_status: string | null
          default_payment_origin: string | null
          delivery_days: number[] | null
          email: string | null
          id: string
          is_active: boolean
          is_brand_supplier: boolean
          lead_time_hours: number | null
          name: string
          notes: string | null
          order_days: number[] | null
          payment_terms_days: number | null
          phone: string | null
          preferred_order_time: string | null
          scope: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          branch_id?: string | null
          category?: string | null
          category_id?: string | null
          contact_name?: string | null
          created_at?: string
          cuit?: string | null
          default_doc_status?: string | null
          default_payment_origin?: string | null
          delivery_days?: number[] | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_brand_supplier?: boolean
          lead_time_hours?: number | null
          name: string
          notes?: string | null
          order_days?: number[] | null
          payment_terms_days?: number | null
          phone?: string | null
          preferred_order_time?: string | null
          scope?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          branch_id?: string | null
          category?: string | null
          category_id?: string | null
          contact_name?: string | null
          created_at?: string
          cuit?: string | null
          default_doc_status?: string | null
          default_payment_origin?: string | null
          delivery_days?: number[] | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_brand_supplier?: boolean
          lead_time_hours?: number | null
          name?: string
          notes?: string | null
          order_days?: number[] | null
          payment_terms_days?: number | null
          phone?: string | null
          preferred_order_time?: string | null
          scope?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "suppliers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_obligations: {
        Row: {
          accrual_date: string
          amount: number
          amount_paid: number | null
          branch_id: string
          coa_account_id: string | null
          created_at: string | null
          created_by: string | null
          due_date: string
          id: string
          name: string
          notes: string | null
          period: string
          status: string
          tax_type: string
          updated_at: string | null
        }
        Insert: {
          accrual_date: string
          amount: number
          amount_paid?: number | null
          branch_id: string
          coa_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date: string
          id?: string
          name: string
          notes?: string | null
          period: string
          status?: string
          tax_type: string
          updated_at?: string | null
        }
        Update: {
          accrual_date?: string
          amount?: number
          amount_paid?: number | null
          branch_id?: string
          coa_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string
          id?: string
          name?: string
          notes?: string | null
          period?: string
          status?: string
          tax_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_obligations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_obligations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_obligations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "tax_obligations_coa_account_id_fkey"
            columns: ["coa_account_id"]
            isOneToOne: false
            referencedRelation: "coa_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          category_group: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
        }
        Insert: {
          category_group: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
        }
        Update: {
          category_group?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          accrual_date: string | null
          amount: number
          attachment_required: boolean | null
          attachments: Json | null
          branch_id: string
          caja_id: string | null
          category_group: string | null
          category_id: string | null
          coa_account_id: string | null
          concept: string
          created_at: string | null
          created_by: string | null
          direction: string | null
          doc_status: string | null
          due_date: string | null
          id: string
          is_locked: boolean | null
          is_payment_to_supplier: boolean | null
          metadata: Json | null
          notes: string | null
          order_id: string | null
          payment_date: string | null
          payment_origin: Database["public"]["Enums"]["payment_origin"]
          receipt_number: string | null
          receipt_type: Database["public"]["Enums"]["receipt_type"]
          recorded_by: string | null
          status: string | null
          supplier_id: string | null
          tax_percentage: number | null
          transaction_date: string
          transfer_executed_at: string | null
          transfer_executed_by: string | null
          transfer_reference: string | null
          transfer_status: string | null
          turno_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          account_id?: string | null
          accrual_date?: string | null
          amount: number
          attachment_required?: boolean | null
          attachments?: Json | null
          branch_id: string
          caja_id?: string | null
          category_group?: string | null
          category_id?: string | null
          coa_account_id?: string | null
          concept: string
          created_at?: string | null
          created_by?: string | null
          direction?: string | null
          doc_status?: string | null
          due_date?: string | null
          id?: string
          is_locked?: boolean | null
          is_payment_to_supplier?: boolean | null
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          payment_date?: string | null
          payment_origin?: Database["public"]["Enums"]["payment_origin"]
          receipt_number?: string | null
          receipt_type?: Database["public"]["Enums"]["receipt_type"]
          recorded_by?: string | null
          status?: string | null
          supplier_id?: string | null
          tax_percentage?: number | null
          transaction_date?: string
          transfer_executed_at?: string | null
          transfer_executed_by?: string | null
          transfer_reference?: string | null
          transfer_status?: string | null
          turno_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          account_id?: string | null
          accrual_date?: string | null
          amount?: number
          attachment_required?: boolean | null
          attachments?: Json | null
          branch_id?: string
          caja_id?: string | null
          category_group?: string | null
          category_id?: string | null
          coa_account_id?: string | null
          concept?: string
          created_at?: string | null
          created_by?: string | null
          direction?: string | null
          doc_status?: string | null
          due_date?: string | null
          id?: string
          is_locked?: boolean | null
          is_payment_to_supplier?: boolean | null
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          payment_date?: string | null
          payment_origin?: Database["public"]["Enums"]["payment_origin"]
          receipt_number?: string | null
          receipt_type?: Database["public"]["Enums"]["receipt_type"]
          recorded_by?: string | null
          status?: string | null
          supplier_id?: string | null
          tax_percentage?: number | null
          transaction_date?: string
          transfer_executed_at?: string | null
          transfer_executed_by?: string | null
          transfer_reference?: string | null
          transfer_status?: string | null
          turno_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "transactions_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_coa_account_id_fkey"
            columns: ["coa_account_id"]
            isOneToOne: false
            referencedRelation: "coa_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "cash_register_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          address: string
          address_lat: number | null
          address_lng: number | null
          created_at: string | null
          floor_apt: string | null
          id: string
          instructions: string | null
          is_default: boolean | null
          label: string | null
          user_id: string
        }
        Insert: {
          address: string
          address_lat?: number | null
          address_lng?: number | null
          created_at?: string | null
          floor_apt?: string | null
          id?: string
          instructions?: string | null
          is_default?: boolean | null
          label?: string | null
          user_id: string
        }
        Update: {
          address?: string
          address_lat?: number | null
          address_lng?: number | null
          created_at?: string | null
          floor_apt?: string | null
          id?: string
          instructions?: string | null
          is_default?: boolean | null
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_branch_access: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      user_branch_permissions: {
        Row: {
          branch_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
          override_type: string | null
          permission_key: string
          user_id: string
        }
        Insert: {
          branch_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          override_type?: string | null
          permission_key: string
          user_id: string
        }
        Update: {
          branch_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          override_type?: string | null
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_permissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_permissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_permissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      user_cash_registers: {
        Row: {
          branch_id: string
          cash_register_id: string
          created_at: string
          id: string
          is_default: boolean | null
          user_id: string
        }
        Insert: {
          branch_id: string
          cash_register_id: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          user_id: string
        }
        Update: {
          branch_id?: string
          cash_register_id?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cash_registers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "user_cash_registers_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          branch_id: string | null
          created_at: string | null
          email: string | null
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          phone: string | null
          requires_attendance: boolean | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by: string
          phone?: string | null
          requires_attendance?: boolean | null
          role: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          phone?: string | null
          requires_attendance?: boolean | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      user_panel_access: {
        Row: {
          brand_access: boolean
          brand_template_id: string | null
          can_use_brand_panel: boolean
          can_use_local_panel: boolean
          created_at: string
          id: string
          local_template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_access?: boolean
          brand_template_id?: string | null
          can_use_brand_panel?: boolean
          can_use_local_panel?: boolean
          created_at?: string
          id?: string
          local_template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_access?: boolean
          brand_template_id?: string | null
          can_use_brand_panel?: boolean
          can_use_local_panel?: boolean
          created_at?: string
          id?: string
          local_template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_panel_access_brand_template_id_fkey"
            columns: ["brand_template_id"]
            isOneToOne: false
            referencedRelation: "brand_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_panel_access_local_template_id_fkey"
            columns: ["local_template_id"]
            isOneToOne: false
            referencedRelation: "local_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          attendance_pin: string | null
          branch_id: string | null
          created_at: string
          custom_permissions: Json | null
          id: string
          is_active: boolean | null
          requires_attendance: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          attendance_pin?: string | null
          branch_id?: string | null
          created_at?: string
          custom_permissions?: Json | null
          id?: string
          is_active?: boolean | null
          requires_attendance?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          attendance_pin?: string | null
          branch_id?: string | null
          created_at?: string
          custom_permissions?: Json | null
          id?: string
          is_active?: boolean | null
          requires_attendance?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      user_roles_v2: {
        Row: {
          authorization_pin_hash: string | null
          branch_ids: string[] | null
          brand_role: Database["public"]["Enums"]["brand_role_type"] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          local_role: Database["public"]["Enums"]["local_role_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          authorization_pin_hash?: string | null
          branch_ids?: string[] | null
          brand_role?: Database["public"]["Enums"]["brand_role_type"] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          local_role?: Database["public"]["Enums"]["local_role_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          authorization_pin_hash?: string | null
          branch_ids?: string[] | null
          brand_role?: Database["public"]["Enums"]["brand_role_type"] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          local_role?: Database["public"]["Enums"]["local_role_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      warnings: {
        Row: {
          acknowledged_at: string | null
          branch_id: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          issued_by: string | null
          user_id: string
          warning_date: string
          warning_type: string
        }
        Insert: {
          acknowledged_at?: string | null
          branch_id: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          issued_by?: string | null
          user_id: string
          warning_date?: string
          warning_type: string
        }
        Update: {
          acknowledged_at?: string | null
          branch_id?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          issued_by?: string | null
          user_id?: string
          warning_date?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warnings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warnings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warnings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
    }
    Views: {
      branches_public: {
        Row: {
          address: string | null
          city: string | null
          closing_time: string | null
          delivery_enabled: boolean | null
          dine_in_enabled: boolean | null
          email: string | null
          estimated_prep_time_min: number | null
          id: string | null
          is_active: boolean | null
          is_open: boolean | null
          latitude: number | null
          local_open_state: boolean | null
          longitude: number | null
          mercadopago_delivery_enabled: boolean | null
          name: string | null
          opening_time: string | null
          pedidosya_enabled: boolean | null
          phone: string | null
          rappi_enabled: boolean | null
          slug: string | null
          takeaway_enabled: boolean | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          delivery_enabled?: boolean | null
          dine_in_enabled?: boolean | null
          email?: string | null
          estimated_prep_time_min?: number | null
          id?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          mercadopago_delivery_enabled?: boolean | null
          name?: string | null
          opening_time?: string | null
          pedidosya_enabled?: boolean | null
          phone?: string | null
          rappi_enabled?: boolean | null
          slug?: string | null
          takeaway_enabled?: boolean | null
        }
        Update: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          delivery_enabled?: boolean | null
          dine_in_enabled?: boolean | null
          email?: string | null
          estimated_prep_time_min?: number | null
          id?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          mercadopago_delivery_enabled?: boolean | null
          name?: string | null
          opening_time?: string | null
          pedidosya_enabled?: boolean | null
          phone?: string | null
          rappi_enabled?: boolean | null
          slug?: string | null
          takeaway_enabled?: boolean | null
        }
        Relationships: []
      }
      employees_basic: {
        Row: {
          branch_id: string | null
          current_status: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          photo_url: string | null
          position: string | null
        }
        Insert: {
          branch_id?: string | null
          current_status?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          photo_url?: string | null
          position?: string | null
        }
        Update: {
          branch_id?: string | null
          current_status?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          photo_url?: string | null
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      supplier_balances: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          current_balance: number | null
          supplier_id: string | null
          supplier_name: string | null
          total_paid: number | null
          total_purchased: number | null
        }
        Relationships: []
      }
      user_effective_permissions: {
        Row: {
          branch_id: string | null
          is_granted: boolean | null
          permission_key: string | null
          source: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_product_cost: {
        Args: { p_product_id: string }
        Returns: number
      }
      can_use_brand_panel: { Args: { _user_id: string }; Returns: boolean }
      can_use_brand_panel_v2: { Args: { _user_id: string }; Returns: boolean }
      can_use_local_panel: { Args: { _user_id: string }; Returns: boolean }
      can_use_local_panel_v2: { Args: { _user_id: string }; Returns: boolean }
      can_view_employee_private_details: {
        Args: { _employee_id: string; _user_id: string }
        Returns: boolean
      }
      check_is_admin: { Args: { _user_id: string }; Returns: boolean }
      check_is_franquiciado_for_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_tokens: { Args: never; Returns: undefined }
      execute_ingredient_conversion: {
        Args: {
          p_branch_id: string
          p_from_ingredient_id: string
          p_quantity: number
          p_reason?: string
          p_to_ingredient_id: string
          p_triggered_by_product_id?: string
        }
        Returns: string
      }
      find_or_create_customer: {
        Args: { p_email?: string; p_name: string; p_phone: string }
        Returns: string
      }
      get_allowed_suppliers_for_ingredient: {
        Args: { p_ingredient_id: string }
        Returns: {
          is_approved: boolean
          is_primary: boolean
          negotiated_price: number
          supplier_id: string
          supplier_name: string
        }[]
      }
      get_available_products_for_channel: {
        Args: { p_branch_id: string; p_channel_slug: string }
        Returns: {
          base_price: number
          category_id: string
          category_name: string
          final_price: number
          image_url: string
          is_available: boolean
          product_description: string
          product_id: string
          product_name: string
          stock_quantity: number
          unavailable_reason: string
        }[]
      }
      get_branch_active_channels: {
        Args: { p_branch_id: string }
        Returns: {
          allows_delivery: boolean
          allows_dine_in: boolean
          allows_takeaway: boolean
          channel_id: string
          channel_name: string
          channel_slug: string
          channel_type: string
          color: string
          config: Json
          icon: string
          is_enabled: boolean
        }[]
      }
      get_branch_effective_state: {
        Args: { p_branch_id: string }
        Returns: string
      }
      get_branch_sensitive_data: {
        Args: { p_branch_id: string }
        Returns: Json
      }
      get_brand_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["brand_role_type"]
      }
      get_cashier_discrepancy_stats: {
        Args: { _branch_id?: string; _user_id: string }
        Returns: {
          discrepancy_this_month: number
          discrepancy_total: number
          last_discrepancy_amount: number
          last_discrepancy_date: string
          perfect_shifts: number
          precision_pct: number
          total_shifts: number
        }[]
      }
      get_local_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["local_role_type"]
      }
      get_shift_advances: {
        Args: { _shift_id: string }
        Returns: {
          amount: number
          authorized_by_name: string
          employee_name: string
          id: string
          paid_at: string
        }[]
      }
      get_shift_expenses: {
        Args: { _shift_id: string }
        Returns: {
          amount: number
          authorized_by_name: string
          category_name: string
          concept: string
          created_at: string
          id: string
          recorded_by_name: string
        }[]
      }
      get_user_branch_roles: {
        Args: { _user_id: string }
        Returns: {
          branch_id: string
          branch_name: string
          roles: string[]
        }[]
      }
      grant_role_defaults: {
        Args: {
          _branch_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      has_branch_access: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_branch_access_v2: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_branch_permission:
        | {
            Args: { _branch_id: string; _permission: string; _user_id: string }
            Returns: boolean
          }
        | {
            Args: { _branch_id: string; _permission: string; _user_id: string }
            Returns: boolean
          }
      has_brand_access: { Args: { _user_id: string }; Returns: boolean }
      has_financial_access: { Args: { p_branch_id: string }; Returns: boolean }
      has_hr_access: { Args: { p_branch_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_branch: {
        Args: { _branch_id?: string; _role: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_item_available_now: {
        Args: { p_category_id?: string; p_product_id?: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      toggle_product_channel_availability: {
        Args: {
          p_branch_id: string
          p_channel_id: string
          p_is_available: boolean
          p_product_id: string
          p_reason?: string
        }
        Returns: boolean
      }
      user_has_branch_access: {
        Args: { p_branch_id: string }
        Returns: boolean
      }
      validate_kds_token: {
        Args: { _token: string }
        Returns: {
          branch_id: string
          branch_name: string
        }[]
      }
      validate_supervisor_pin: {
        Args: { _branch_id: string; _pin: string }
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      validate_supplier_for_ingredient: {
        Args: { p_ingredient_id: string; p_supplier_id: string }
        Returns: boolean
      }
      verify_authorization_pin: {
        Args: { _branch_id: string; _pin: string }
        Returns: {
          full_name: string
          local_role: Database["public"]["Enums"]["local_role_type"]
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente"
        | "empleado"
        | "franquiciado"
        | "socio"
        | "coordinador"
        | "encargado"
        | "cajero"
        | "kds"
      brand_role_type:
        | "superadmin"
        | "coordinador"
        | "informes"
        | "contador_marca"
      communication_type: "info" | "warning" | "urgent" | "celebration"
      local_role_type:
        | "franquiciado"
        | "encargado"
        | "contador_local"
        | "cajero"
        | "empleado"
      order_area: "salon" | "mostrador" | "delivery"
      order_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "waiting_pickup"
        | "in_transit"
        | "delivered"
        | "cancelled"
      order_type: "takeaway" | "delivery" | "dine_in"
      payment_method:
        | "efectivo"
        | "tarjeta_debito"
        | "tarjeta_credito"
        | "mercadopago_qr"
        | "mercadopago_link"
        | "transferencia"
        | "vales"
      payment_origin: "cash" | "mercadopago" | "bank_transfer" | "credit_card"
      permission_scope: "local" | "brand"
      receipt_type: "OFFICIAL" | "INTERNAL"
      sales_channel:
        | "atencion_presencial"
        | "whatsapp"
        | "mas_delivery"
        | "pedidos_ya"
        | "rappi"
        | "mercadopago_delivery"
        | "web_app"
        | "pos_local"
        | "salon"
        | "mostrador"
        | "webapp"
      stock_movement_type:
        | "sale"
        | "purchase"
        | "adjustment"
        | "waste"
        | "transfer_in"
        | "transfer_out"
        | "count_adjust"
        | "production"
      supplier_control_type: "brand_only" | "brand_preferred" | "free"
      transaction_type: "income" | "expense"
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
      app_role: [
        "admin",
        "gerente",
        "empleado",
        "franquiciado",
        "socio",
        "coordinador",
        "encargado",
        "cajero",
        "kds",
      ],
      brand_role_type: [
        "superadmin",
        "coordinador",
        "informes",
        "contador_marca",
      ],
      communication_type: ["info", "warning", "urgent", "celebration"],
      local_role_type: [
        "franquiciado",
        "encargado",
        "contador_local",
        "cajero",
        "empleado",
      ],
      order_area: ["salon", "mostrador", "delivery"],
      order_status: [
        "draft",
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "waiting_pickup",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      order_type: ["takeaway", "delivery", "dine_in"],
      payment_method: [
        "efectivo",
        "tarjeta_debito",
        "tarjeta_credito",
        "mercadopago_qr",
        "mercadopago_link",
        "transferencia",
        "vales",
      ],
      payment_origin: ["cash", "mercadopago", "bank_transfer", "credit_card"],
      permission_scope: ["local", "brand"],
      receipt_type: ["OFFICIAL", "INTERNAL"],
      sales_channel: [
        "atencion_presencial",
        "whatsapp",
        "mas_delivery",
        "pedidos_ya",
        "rappi",
        "mercadopago_delivery",
        "web_app",
        "pos_local",
        "salon",
        "mostrador",
        "webapp",
      ],
      stock_movement_type: [
        "sale",
        "purchase",
        "adjustment",
        "waste",
        "transfer_in",
        "transfer_out",
        "count_adjust",
        "production",
      ],
      supplier_control_type: ["brand_only", "brand_preferred", "free"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
