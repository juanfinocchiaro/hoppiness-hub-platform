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
      branch_closure_config: {
        Row: {
          branch_id: string
          config_id: string
          habilitado: boolean | null
          id: string
        }
        Insert: {
          branch_id: string
          config_id: string
          habilitado?: boolean | null
          id?: string
        }
        Update: {
          branch_id?: string
          config_id?: string
          habilitado?: boolean | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_closure_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_closure_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_closure_config_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "brand_closure_config"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_inspections: {
        Row: {
          action_items: Json | null
          branch_id: string
          completed_at: string | null
          created_at: string
          critical_findings: string | null
          general_notes: string | null
          id: string
          inspection_type: string
          inspector_id: string
          present_manager_id: string | null
          score_total: number | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          branch_id: string
          completed_at?: string | null
          created_at?: string
          critical_findings?: string | null
          general_notes?: string | null
          id?: string
          inspection_type: string
          inspector_id: string
          present_manager_id?: string | null
          score_total?: number | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          branch_id?: string
          completed_at?: string | null
          created_at?: string
          critical_findings?: string | null
          general_notes?: string | null
          id?: string
          inspection_type?: string
          inspector_id?: string
          present_manager_id?: string | null
          score_total?: number | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_inspections_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inspections_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
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
        ]
      }
      branches: {
        Row: {
          address: string
          admin_force_channels: Json | null
          admin_force_message: string | null
          admin_force_state: string | null
          city: string
          clock_code: string | null
          closing_time: string | null
          created_at: string
          email: string | null
          enforce_labor_law: boolean
          expense_pin_threshold: number | null
          id: string
          is_active: boolean
          is_open: boolean | null
          latitude: number | null
          local_open_state: boolean | null
          longitude: number | null
          name: string
          opening_time: string | null
          phone: string | null
          public_hours: Json | null
          public_status: string | null
          shifts_morning_enabled: boolean | null
          shifts_overnight_enabled: boolean | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          address: string
          admin_force_channels?: Json | null
          admin_force_message?: string | null
          admin_force_state?: string | null
          city: string
          clock_code?: string | null
          closing_time?: string | null
          created_at?: string
          email?: string | null
          enforce_labor_law?: boolean
          expense_pin_threshold?: number | null
          id?: string
          is_active?: boolean
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          name: string
          opening_time?: string | null
          phone?: string | null
          public_hours?: Json | null
          public_status?: string | null
          shifts_morning_enabled?: boolean | null
          shifts_overnight_enabled?: boolean | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          admin_force_channels?: Json | null
          admin_force_message?: string | null
          admin_force_state?: string | null
          city?: string
          clock_code?: string | null
          closing_time?: string | null
          created_at?: string
          email?: string | null
          enforce_labor_law?: boolean
          expense_pin_threshold?: number | null
          id?: string
          is_active?: boolean
          is_open?: boolean | null
          latitude?: number | null
          local_open_state?: boolean | null
          longitude?: number | null
          name?: string
          opening_time?: string | null
          phone?: string | null
          public_hours?: Json | null
          public_status?: string | null
          shifts_morning_enabled?: boolean | null
          shifts_overnight_enabled?: boolean | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brand_closure_config: {
        Row: {
          activo: boolean | null
          categoria_padre: string | null
          clave: string
          created_at: string | null
          etiqueta: string
          id: string
          orden: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria_padre?: string | null
          clave: string
          created_at?: string | null
          etiqueta: string
          id?: string
          orden?: number | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria_padre?: string | null
          clave?: string
          created_at?: string | null
          etiqueta?: string
          id?: string
          orden?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clock_entries: {
        Row: {
          branch_id: string
          created_at: string | null
          entry_type: string
          gps_message: string | null
          gps_status: string | null
          id: string
          ip_address: unknown
          latitude: number | null
          longitude: number | null
          photo_url: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          entry_type: string
          gps_message?: string | null
          gps_status?: string | null
          id?: string
          ip_address?: unknown
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          entry_type?: string
          gps_message?: string | null
          gps_status?: string | null
          id?: string
          ip_address?: unknown
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clock_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_competency_scores: {
        Row: {
          coaching_id: string
          competency_id: string
          competency_type: string
          created_at: string
          id: string
          notes: string | null
          score: number
        }
        Insert: {
          coaching_id: string
          competency_id: string
          competency_type: string
          created_at?: string
          id?: string
          notes?: string | null
          score: number
        }
        Update: {
          coaching_id?: string
          competency_id?: string
          competency_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "coaching_competency_scores_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_station_scores: {
        Row: {
          coaching_id: string
          created_at: string
          id: string
          notes: string | null
          score: number
          station_id: string
        }
        Insert: {
          coaching_id: string
          created_at?: string
          id?: string
          notes?: string | null
          score: number
          station_id: string
        }
        Update: {
          coaching_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          score?: number
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_station_scores_coaching_id_fkey"
            columns: ["coaching_id"]
            isOneToOne: false
            referencedRelation: "coachings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_station_scores_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "work_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      coachings: {
        Row: {
          acknowledged_at: string | null
          acknowledged_notes: string | null
          action_plan: string | null
          areas_to_improve: string | null
          branch_id: string
          coaching_date: string
          coaching_month: number
          coaching_type: string | null
          coaching_year: number
          created_at: string
          evaluated_by: string
          general_score: number | null
          id: string
          manager_notes: string | null
          overall_score: number | null
          previous_action_review: string | null
          station_score: number | null
          strengths: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_notes?: string | null
          action_plan?: string | null
          areas_to_improve?: string | null
          branch_id: string
          coaching_date?: string
          coaching_month: number
          coaching_type?: string | null
          coaching_year: number
          created_at?: string
          evaluated_by: string
          general_score?: number | null
          id?: string
          manager_notes?: string | null
          overall_score?: number | null
          previous_action_review?: string | null
          station_score?: number | null
          strengths?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_notes?: string | null
          action_plan?: string | null
          areas_to_improve?: string | null
          branch_id?: string
          coaching_date?: string
          coaching_month?: number
          coaching_type?: string | null
          coaching_year?: number
          created_at?: string
          evaluated_by?: string
          general_score?: number | null
          id?: string
          manager_notes?: string | null
          overall_score?: number | null
          previous_action_review?: string | null
          station_score?: number | null
          strengths?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coachings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coachings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_reads: {
        Row: {
          communication_id: string
          confirmed_at: string | null
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          communication_id: string
          confirmed_at?: string | null
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          communication_id?: string
          confirmed_at?: string | null
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
          custom_label: string | null
          expires_at: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          requires_confirmation: boolean | null
          source_branch_id: string | null
          source_type: string | null
          tag: string | null
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
          custom_label?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          requires_confirmation?: boolean | null
          source_branch_id?: string | null
          source_type?: string | null
          tag?: string | null
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
          custom_label?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          requires_confirmation?: boolean | null
          source_branch_id?: string | null
          source_type?: string | null
          tag?: string | null
          target_branch_ids?: string[] | null
          target_roles?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["communication_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_source_branch_id_fkey"
            columns: ["source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_source_branch_id_fkey"
            columns: ["source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
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
          investment_range: string | null
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
          investment_range?: string | null
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
          investment_range?: string | null
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
        ]
      }
      employee_certifications: {
        Row: {
          branch_id: string
          certified_at: string | null
          certified_by: string | null
          created_at: string
          id: string
          level: number
          notes: string | null
          station_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          id?: string
          level?: number
          notes?: string | null
          station_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          id?: string
          level?: number
          notes?: string | null
          station_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certifications_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "work_stations"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      employee_schedules: {
        Row: {
          branch_id: string | null
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          end_time_2: string | null
          id: string
          is_day_off: boolean | null
          modification_reason: string | null
          modified_at: string | null
          modified_by: string | null
          notification_sent_at: string | null
          published_at: string | null
          published_by: string | null
          schedule_date: string | null
          schedule_month: number | null
          schedule_year: number | null
          shift_number: number
          start_time: string
          start_time_2: string | null
          updated_at: string
          user_id: string | null
          work_position: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time: string
          end_time_2?: string | null
          id?: string
          is_day_off?: boolean | null
          modification_reason?: string | null
          modified_at?: string | null
          modified_by?: string | null
          notification_sent_at?: string | null
          published_at?: string | null
          published_by?: string | null
          schedule_date?: string | null
          schedule_month?: number | null
          schedule_year?: number | null
          shift_number?: number
          start_time: string
          start_time_2?: string | null
          updated_at?: string
          user_id?: string | null
          work_position?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          end_time_2?: string | null
          id?: string
          is_day_off?: boolean | null
          modification_reason?: string | null
          modified_at?: string | null
          modified_by?: string | null
          notification_sent_at?: string | null
          published_at?: string | null
          published_by?: string | null
          schedule_date?: string | null
          schedule_month?: number | null
          schedule_year?: number | null
          shift_number?: number
          start_time?: string
          start_time_2?: string | null
          updated_at?: string
          user_id?: string | null
          work_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      general_competencies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
          weight?: number
        }
        Relationships: []
      }
      inspection_items: {
        Row: {
          category: string
          complies: boolean | null
          created_at: string
          id: string
          inspection_id: string
          item_key: string
          item_label: string
          observations: string | null
          photo_url: string | null
          sort_order: number
        }
        Insert: {
          category: string
          complies?: boolean | null
          created_at?: string
          id?: string
          inspection_id: string
          item_key: string
          item_label: string
          observations?: string | null
          photo_url?: string | null
          sort_order?: number
        }
        Update: {
          category?: string
          complies?: boolean | null
          created_at?: string
          id?: string
          inspection_id?: string
          item_key?: string
          item_label?: string
          observations?: string | null
          photo_url?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "branch_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          inspection_type: string
          is_active: boolean
          item_key: string
          item_label: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          inspection_type: string
          is_active?: boolean
          item_key: string
          item_label: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          inspection_type?: string
          is_active?: boolean
          item_key?: string
          item_label?: string
          sort_order?: number
        }
        Relationships: []
      }
      manager_competencies: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          rubric_1: string | null
          rubric_3: string | null
          rubric_5: string | null
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          rubric_1?: string | null
          rubric_3?: string | null
          rubric_5?: string | null
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          rubric_1?: string | null
          rubric_3?: string | null
          rubric_5?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      meeting_agreement_assignees: {
        Row: {
          agreement_id: string
          id: string
          user_id: string
        }
        Insert: {
          agreement_id: string
          id?: string
          user_id: string
        }
        Update: {
          agreement_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agreement_assignees_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "meeting_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agreements: {
        Row: {
          created_at: string
          description: string
          id: string
          meeting_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          meeting_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          meeting_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agreements_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          attended: boolean
          created_at: string
          id: string
          meeting_id: string
          notified_at: string | null
          read_at: string | null
          reminder_count: number | null
          user_id: string
          was_present: boolean | null
        }
        Insert: {
          attended?: boolean
          created_at?: string
          id?: string
          meeting_id: string
          notified_at?: string | null
          read_at?: string | null
          reminder_count?: number | null
          user_id: string
          was_present?: boolean | null
        }
        Update: {
          attended?: boolean
          created_at?: string
          id?: string
          meeting_id?: string
          notified_at?: string | null
          read_at?: string | null
          reminder_count?: number | null
          user_id?: string
          was_present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          area: string
          branch_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          date: string
          id: string
          notes: string | null
          scheduled_at: string | null
          source: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          area?: string
          branch_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          date: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          area?: string
          branch_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          source?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_config: {
        Row: {
          allowed_roles: string[]
          category: string
          created_at: string | null
          id: string
          is_editable: boolean | null
          permission_key: string
          permission_label: string
          scope: string
        }
        Insert: {
          allowed_roles: string[]
          category: string
          created_at?: string | null
          id?: string
          is_editable?: boolean | null
          permission_key: string
          permission_label: string
          scope: string
        }
        Update: {
          allowed_roles?: string[]
          category?: string
          created_at?: string | null
          id?: string
          is_editable?: boolean | null
          permission_key?: string
          permission_label?: string
          scope?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          cbu: string | null
          clock_pin: string | null
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
          help_dismissed_pages: string[] | null
          id: string
          internal_notes: Json | null
          invitation_token: string | null
          is_active: boolean
          last_order_at: string | null
          loyalty_points: number | null
          onboarding_completed_at: string | null
          phone: string | null
          pin_hash: string | null
          show_floating_help: boolean | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          accepted_terms_at?: string | null
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cbu?: string | null
          clock_pin?: string | null
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
          help_dismissed_pages?: string[] | null
          id?: string
          internal_notes?: Json | null
          invitation_token?: string | null
          is_active?: boolean
          last_order_at?: string | null
          loyalty_points?: number | null
          onboarding_completed_at?: string | null
          phone?: string | null
          pin_hash?: string | null
          show_floating_help?: boolean | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          accepted_terms_at?: string | null
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cbu?: string | null
          clock_pin?: string | null
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
          help_dismissed_pages?: string[] | null
          id?: string
          internal_notes?: Json | null
          invitation_token?: string | null
          is_active?: boolean
          last_order_at?: string | null
          loyalty_points?: number | null
          onboarding_completed_at?: string | null
          phone?: string | null
          pin_hash?: string | null
          show_floating_help?: boolean | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
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
        ]
      }
      regulation_signatures: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          regulation_id: string
          regulation_version: number | null
          signed_at: string
          signed_document_url: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          regulation_id: string
          regulation_version?: number | null
          signed_at?: string
          signed_document_url: string
          uploaded_by: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          regulation_id?: string
          regulation_version?: number | null
          signed_at?: string
          signed_document_url?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulation_signatures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_signatures_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulation_signatures_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string
          effective_date: string
          id: string
          is_active: boolean
          pdf_url: string | null
          published_at: string | null
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url: string
          effective_date?: string
          id?: string
          is_active?: boolean
          pdf_url?: string | null
          published_at?: string | null
          title?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          pdf_url?: string | null
          published_at?: string | null
          title?: string
          version?: number
        }
        Relationships: []
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
        ]
      }
      schedule_requests: {
        Row: {
          absence_type: string | null
          branch_id: string
          created_at: string | null
          evidence_url: string | null
          id: string
          reason: string | null
          request_date: string
          request_type: string
          responded_at: string | null
          responded_by: string | null
          response_note: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          absence_type?: string | null
          branch_id: string
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          reason?: string | null
          request_date: string
          request_type: string
          responded_at?: string | null
          responded_by?: string | null
          response_note?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          absence_type?: string | null
          branch_id?: string
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          reason?: string | null
          request_date?: string
          request_type?: string
          responded_at?: string | null
          responded_by?: string | null
          response_note?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_closures: {
        Row: {
          arqueo_caja: Json | null
          branch_id: string
          cerrado_at: string
          cerrado_por: string
          diferencia_apps: number | null
          diferencia_posnet: number | null
          facturacion_diferencia: number
          facturacion_esperada: number
          fecha: string
          hamburguesas: Json
          id: string
          notas: string | null
          tiene_alerta_apps: boolean | null
          tiene_alerta_caja: boolean | null
          tiene_alerta_facturacion: boolean
          tiene_alerta_posnet: boolean | null
          total_digital: number
          total_efectivo: number
          total_facturado: number
          total_hamburguesas: number
          total_vendido: number
          turno: string
          updated_at: string | null
          updated_by: string | null
          ventas_apps: Json
          ventas_local: Json
        }
        Insert: {
          arqueo_caja?: Json | null
          branch_id: string
          cerrado_at?: string
          cerrado_por: string
          diferencia_apps?: number | null
          diferencia_posnet?: number | null
          facturacion_diferencia?: number
          facturacion_esperada?: number
          fecha: string
          hamburguesas?: Json
          id?: string
          notas?: string | null
          tiene_alerta_apps?: boolean | null
          tiene_alerta_caja?: boolean | null
          tiene_alerta_facturacion?: boolean
          tiene_alerta_posnet?: boolean | null
          total_digital?: number
          total_efectivo?: number
          total_facturado?: number
          total_hamburguesas?: number
          total_vendido?: number
          turno: string
          updated_at?: string | null
          updated_by?: string | null
          ventas_apps?: Json
          ventas_local?: Json
        }
        Update: {
          arqueo_caja?: Json | null
          branch_id?: string
          cerrado_at?: string
          cerrado_por?: string
          diferencia_apps?: number | null
          diferencia_posnet?: number | null
          facturacion_diferencia?: number
          facturacion_esperada?: number
          fecha?: string
          hamburguesas?: Json
          id?: string
          notas?: string | null
          tiene_alerta_apps?: boolean | null
          tiene_alerta_caja?: boolean | null
          tiene_alerta_facturacion?: boolean
          tiene_alerta_posnet?: boolean | null
          total_digital?: number
          total_efectivo?: number
          total_facturado?: number
          total_hamburguesas?: number
          total_vendido?: number
          turno?: string
          updated_at?: string | null
          updated_by?: string | null
          ventas_apps?: Json
          ventas_local?: Json
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
        ]
      }
      special_days: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          day_date: string
          day_type: string
          description: string
          id: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          day_date: string
          day_type: string
          description: string
          id?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          day_date?: string
          day_type?: string
          description?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_days_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_days_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
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
          full_name: string | null
          id: string
          invited_by: string
          role: string
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
          full_name?: string | null
          id?: string
          invited_by: string
          role?: string
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
          full_name?: string | null
          id?: string
          invited_by?: string
          role?: string
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
        ]
      }
      station_competencies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
          station_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
          station_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_competencies_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "work_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branch_roles: {
        Row: {
          branch_id: string
          clock_pin: string | null
          created_at: string | null
          default_position: string | null
          id: string
          is_active: boolean | null
          local_role: Database["public"]["Enums"]["local_role_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branch_id: string
          clock_pin?: string | null
          created_at?: string | null
          default_position?: string | null
          id?: string
          is_active?: boolean | null
          local_role: Database["public"]["Enums"]["local_role_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string
          clock_pin?: string | null
          created_at?: string | null
          default_position?: string | null
          id?: string
          is_active?: boolean | null
          local_role?: Database["public"]["Enums"]["local_role_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles_v2: {
        Row: {
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
          signed_document_url: string | null
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
          signed_document_url?: string | null
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
          signed_document_url?: string | null
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
        ]
      }
      work_positions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      work_stations: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      branches_public: {
        Row: {
          address: string | null
          city: string | null
          closing_time: string | null
          id: string | null
          is_active: boolean | null
          is_open: boolean | null
          local_open_state: boolean | null
          name: string | null
          opening_time: string | null
          public_hours: Json | null
          public_status: string | null
          slug: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          id?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          local_open_state?: boolean | null
          name?: string | null
          opening_time?: string | null
          public_hours?: Json | null
          public_status?: string | null
          slug?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          id?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          local_open_state?: boolean | null
          name?: string | null
          opening_time?: string | null
          public_hours?: Json | null
          public_status?: string | null
          slug?: string | null
        }
        Relationships: []
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
    }
    Functions: {
      can_access_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_close_shift: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_coaching: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_coaching: {
        Args: { _coaching_id: string; _user_id: string }
        Returns: boolean
      }
      get_branch_contact_info: {
        Args: { _branch_id: string }
        Returns: {
          email: string
          latitude: number
          longitude: number
          phone: string
        }[]
      }
      get_branch_for_clock: {
        Args: { _clock_code: string }
        Returns: {
          clock_code: string
          id: string
          latitude: number
          longitude: number
          name: string
        }[]
      }
      get_brand_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["brand_role_type"]
      }
      get_local_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["local_role_type"]
      }
      get_local_role_for_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["local_role_type"]
      }
      get_user_branches: {
        Args: { _user_id: string }
        Returns: {
          branch_id: string
          local_role: Database["public"]["Enums"]["local_role_type"]
        }[]
      }
      has_branch_access_v2: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_branch_role: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_financial_access: { Args: { p_branch_id: string }; Returns: boolean }
      has_hr_access: { Args: { p_branch_id: string }; Returns: boolean }
      is_branch_manager_v2: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_cashier_for_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_clock_pin_available: {
        Args: { _branch_id: string; _exclude_user_id?: string; _pin: string }
        Returns: boolean
      }
      is_financial_for_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_financial_manager: { Args: { user_uuid: string }; Returns: boolean }
      is_hr_for_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_hr_for_branch_v2: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_hr_manager: { Args: { user_uuid: string }; Returns: boolean }
      is_hr_role: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      is_meeting_participant: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_staff_member: { Args: { _user_id: string }; Returns: boolean }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      sync_orphan_users: {
        Args: never
        Returns: {
          synced_action: string
          synced_email: string
          synced_user_id: string
        }[]
      }
      user_has_branch_access: {
        Args: { p_branch_id: string }
        Returns: boolean
      }
      validate_clock_pin: {
        Args: { _branch_code: string; _pin: string }
        Returns: {
          branch_id: string
          branch_name: string
          full_name: string
          user_id: string
        }[]
      }
      validate_clock_pin_v2: {
        Args: { _branch_code: string; _pin: string }
        Returns: {
          branch_id: string
          branch_name: string
          full_name: string
          user_id: string
        }[]
      }
      validate_invitation_token: {
        Args: { _token: string }
        Returns: {
          branch_id: string
          branch_name: string
          email: string
          expires_at: string
          full_name: string
          id: string
          role: string
          status: string
        }[]
      }
    }
    Enums: {
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
      work_position_type:
        | "cajero"
        | "cocinero"
        | "barista"
        | "runner"
        | "lavacopas"
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
      work_position_type: [
        "cajero",
        "cocinero",
        "barista",
        "runner",
        "lavacopas",
      ],
    },
  },
} as const
