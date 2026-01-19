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
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
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
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
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
          allowed_ips: string[] | null
          auto_invoice_integrations: boolean
          city: string
          closing_time: string | null
          created_at: string
          delivery_enabled: boolean | null
          dine_in_enabled: boolean | null
          email: string | null
          enforce_labor_law: boolean
          estimated_prep_time_min: number | null
          facturante_api_key: string | null
          facturante_cuit: string | null
          facturante_enabled: boolean | null
          facturante_punto_venta: number | null
          id: string
          invoice_provider: string | null
          is_active: boolean
          is_open: boolean | null
          local_channels: Json | null
          local_open_state: boolean | null
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
          status_message: string | null
          takeaway_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          address: string
          admin_force_channels?: Json | null
          admin_force_message?: string | null
          admin_force_state?: string | null
          allowed_ips?: string[] | null
          auto_invoice_integrations?: boolean
          city: string
          closing_time?: string | null
          created_at?: string
          delivery_enabled?: boolean | null
          dine_in_enabled?: boolean | null
          email?: string | null
          enforce_labor_law?: boolean
          estimated_prep_time_min?: number | null
          facturante_api_key?: string | null
          facturante_cuit?: string | null
          facturante_enabled?: boolean | null
          facturante_punto_venta?: number | null
          id?: string
          invoice_provider?: string | null
          is_active?: boolean
          is_open?: boolean | null
          local_channels?: Json | null
          local_open_state?: boolean | null
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
          status_message?: string | null
          takeaway_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          address?: string
          admin_force_channels?: Json | null
          admin_force_message?: string | null
          admin_force_state?: string | null
          allowed_ips?: string[] | null
          auto_invoice_integrations?: boolean
          city?: string
          closing_time?: string | null
          created_at?: string
          delivery_enabled?: boolean | null
          dine_in_enabled?: boolean | null
          email?: string | null
          enforce_labor_law?: boolean
          estimated_prep_time_min?: number | null
          facturante_api_key?: string | null
          facturante_cuit?: string | null
          facturante_enabled?: boolean | null
          facturante_punto_venta?: number | null
          id?: string
          invoice_provider?: string | null
          is_active?: boolean
          is_open?: boolean | null
          local_channels?: Json | null
          local_open_state?: boolean | null
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
          status_message?: string | null
          takeaway_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_register_movements: {
        Row: {
          amount: number
          branch_id: string
          concept: string
          created_at: string
          id: string
          order_id: string | null
          payment_method: string
          recorded_by: string | null
          shift_id: string
          transaction_id: string | null
          type: string
        }
        Insert: {
          amount: number
          branch_id: string
          concept: string
          created_at?: string
          id?: string
          order_id?: string | null
          payment_method: string
          recorded_by?: string | null
          shift_id: string
          transaction_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          branch_id?: string
          concept?: string
          created_at?: string
          id?: string
          order_id?: string | null
          payment_method?: string
          recorded_by?: string | null
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
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
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
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cuit?: string | null
          dni?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cuit?: string | null
          dni?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
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
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: string | null
          cost_per_unit: number | null
          created_at: string
          id: string
          is_active: boolean
          min_stock: number | null
          name: string
          notes: string | null
          sku: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number | null
          name: string
          notes?: string | null
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock?: number | null
          name?: string
          notes?: string | null
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
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
      modifier_groups: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          max_selections: number | null
          min_selections: number | null
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
          is_active: boolean
          is_enabled_by_brand: boolean
          name: string
          price_adjustment: number
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          group_id: string
          id?: string
          is_active?: boolean
          is_enabled_by_brand?: boolean
          name: string
          price_adjustment?: number
        }
        Update: {
          created_at?: string
          display_order?: number | null
          group_id?: string
          id?: string
          is_active?: boolean
          is_enabled_by_brand?: boolean
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
        }
        Insert: {
          created_at?: string
          id?: string
          modifier_option_id: string
          option_name: string
          order_item_id: string
          price_adjustment?: number
        }
        Update: {
          created_at?: string
          id?: string
          modifier_option_id?: string
          option_name?: string
          order_item_id?: string
          price_adjustment?: number
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
          product_id: string
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
          product_id: string
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
          product_id?: string
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
          invoice_type: string
          is_finalized: boolean | null
          notes: string | null
          order_area: Database["public"]["Enums"]["order_area"] | null
          order_group_id: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          sales_channel: Database["public"]["Enums"]["sales_channel"] | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_number: string | null
          tax: number | null
          tip_amount: number | null
          total: number
          tracking_token: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          branch_id: string
          caller_number?: number | null
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
          invoice_type?: string
          is_finalized?: boolean | null
          notes?: string | null
          order_area?: Database["public"]["Enums"]["order_area"] | null
          order_group_id?: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          sales_channel?: Database["public"]["Enums"]["sales_channel"] | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_number?: string | null
          tax?: number | null
          tip_amount?: number | null
          total: number
          tracking_token?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          branch_id?: string
          caller_number?: number | null
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
          invoice_type?: string
          is_finalized?: boolean | null
          notes?: string | null
          order_area?: Database["public"]["Enums"]["order_area"] | null
          order_group_id?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          sales_channel?: Database["public"]["Enums"]["sales_channel"] | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_number?: string | null
          tax?: number | null
          tip_amount?: number | null
          total?: number
          tracking_token?: string | null
          updated_at?: string
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
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
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
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          min_role?: Database["public"]["Enums"]["app_role"]
          module: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          min_role?: Database["public"]["Enums"]["app_role"]
          module?: string
          name?: string
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
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
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
          id: string
          image_url: string | null
          is_available: boolean
          is_enabled_by_brand: boolean
          is_featured: boolean | null
          name: string
          preparation_time: number | null
          price: number
          product_type: string
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_enabled_by_brand?: boolean
          is_featured?: boolean | null
          name: string
          preparation_time?: number | null
          price: number
          product_type?: string
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_enabled_by_brand?: boolean
          is_featured?: boolean | null
          name?: string
          preparation_time?: number | null
          price?: number
          product_type?: string
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
          dni: string | null
          dni_back_url: string | null
          dni_front_url: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          invitation_token: string | null
          is_active: boolean
          phone: string | null
          pin_hash: string | null
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
          dni?: string | null
          dni_back_url?: string | null
          dni_front_url?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          invitation_token?: string | null
          is_active?: boolean
          phone?: string | null
          pin_hash?: string | null
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
          dni?: string | null
          dni_back_url?: string | null
          dni_front_url?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          invitation_token?: string | null
          is_active?: boolean
          phone?: string | null
          pin_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          category_id: string | null
          contact_name: string | null
          created_at: string
          cuit: string | null
          default_doc_status: string | null
          default_payment_origin: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          category_id?: string | null
          contact_name?: string | null
          created_at?: string
          cuit?: string | null
          default_doc_status?: string | null
          default_payment_origin?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          category_id?: string | null
          contact_name?: string | null
          created_at?: string
          cuit?: string | null
          default_doc_status?: string | null
          default_payment_origin?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "supplier_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          area: Database["public"]["Enums"]["order_area"]
          branch_id: string
          created_at: string
          current_order_id: string | null
          id: string
          is_occupied: boolean
          table_number: string
        }
        Insert: {
          area?: Database["public"]["Enums"]["order_area"]
          branch_id: string
          created_at?: string
          current_order_id?: string | null
          id?: string
          is_occupied?: boolean
          table_number: string
        }
        Update: {
          area?: Database["public"]["Enums"]["order_area"]
          branch_id?: string
          created_at?: string
          current_order_id?: string | null
          id?: string
          is_occupied?: boolean
          table_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "tables_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      user_branch_permissions: {
        Row: {
          branch_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          branch_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          branch_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
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
    }
    Functions: {
      calculate_product_cost: {
        Args: { p_product_id: string }
        Returns: number
      }
      can_view_employee_private_details: {
        Args: { _employee_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_tokens: { Args: never; Returns: undefined }
      get_branch_effective_state: {
        Args: { p_branch_id: string }
        Returns: string
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
      has_branch_permission:
        | {
            Args: { _branch_id: string; _permission: string; _user_id: string }
            Returns: boolean
          }
        | {
            Args: { _branch_id: string; _permission: string; _user_id: string }
            Returns: boolean
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_item_available_now: {
        Args: { p_category_id?: string; p_product_id?: string }
        Returns: boolean
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
      stock_movement_type:
        | "sale"
        | "purchase"
        | "adjustment"
        | "waste"
        | "transfer_in"
        | "transfer_out"
        | "count_adjust"
        | "production"
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
      transaction_type: ["income", "expense"],
    },
  },
} as const
